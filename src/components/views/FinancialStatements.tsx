import { useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Inbox,
  Landmark,
  Receipt,
  Waves,
  type LucideIcon,
} from "lucide-react";
import Highcharts from "@/lib/highcharts";
import HighchartsReact from "highcharts-react-official";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useBalanceSheet,
  useCashFlowStatement,
  useCategories,
  useFinancialHealth,
  useIncomeStatement,
} from "@/lib/hooks/use-api";
import { useAmountsHidden, useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { useChartColors } from "@/lib/hooks/use-chart-colors";
import { summaryCategoryName } from "@/lib/api/finance";
import {
  paymentMethodLabel,
  type BalanceCurrencyStatement,
  type CreditCardLine,
  type HealthCurrencyIndicators,
  type IncomeCurrencyStatement,
  type NetWorthEvolutionPoint,
  type StatementPeriod,
  type StatementVariance,
} from "@/lib/api/statements";

// ─── Formato ────────────────────────────────────────────────────────────────

const NO_DATA = "sin datos";

const pctFmt = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 });
const signedPctFmt = new Intl.NumberFormat("es-CO", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

/** `*_pct` del API viene en escala 0–100. `null` → "sin datos", nunca 0. */
const fmtPct = (v: number | null) => (v == null ? NO_DATA : pctFmt.format(v / 100));

const decimalFmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const compactFmt = new Intl.NumberFormat("es-CO", {
  notation: "compact",
  maximumFractionDigits: 1,
});
/** Número con unidad ("1,5 veces", "3 meses"); `null` → "sin datos". */
const fmtUnit = (v: number | null, unit: string) =>
  v == null ? NO_DATA : `${decimalFmt.format(v)} ${unit}`;

type AmountFormatter = ReturnType<typeof useFormattedAmount>;

// ─── Periodo (?month=YYYY-MM en la web; al API van year/month) ───────────────

// El API solo acepta años 2000–2100 (otro año es 400): fuera de rango se usa el mes actual.
const MONTH_RE = /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/;

function currentPeriod(): StatementPeriod {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function parsePeriod(v: string | null): StatementPeriod {
  const m = v ? MONTH_RE.exec(v) : null;
  return m ? { year: Number(m[1]), month: Number(m[2]) } : currentPeriod();
}

function shiftPeriod(p: StatementPeriod, delta: number): string {
  const d = new Date(p.year, p.month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const periodLabel = (p: StatementPeriod) =>
  new Date(p.year, p.month - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });

const fmtMonth = (yyyyMm: string) =>
  new Date(`${yyyyMm}-01T00:00:00`).toLocaleDateString("es-CO", {
    month: "short",
    year: "numeric",
  });

const fmtDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });

// ─── Piezas compartidas ──────────────────────────────────────────────────────

/**
 * Variación con flecha y signo en el texto, así no depende solo del color (R5.3).
 * `upIsGood` decide el color: subir ingresos es bueno, subir gastos no.
 */
function Delta({
  variance,
  upIsGood,
  muted = false,
}: {
  variance: Pick<StatementVariance, "change_pct"> & { change?: number };
  upIsGood: boolean;
  muted?: boolean;
}) {
  const pct = variance.change_pct;
  if (pct == null) return <span className="text-muted-foreground">{NO_DATA}</span>;
  const dir = Math.sign(pct);
  const arrow = dir > 0 ? "▲" : dir < 0 ? "▼" : "=";
  const good = dir === 0 ? null : dir > 0 === upIsGood;
  return (
    <span
      className={cn(
        "tabular-nums",
        muted || good == null
          ? "text-muted-foreground"
          : good
            ? "text-success"
            : "text-destructive",
      )}
    >
      <span aria-hidden="true">{arrow} </span>
      {signedPctFmt.format(pct / 100)}
    </span>
  );
}

function CurrencyBlock({ currency, children }: { currency: string; children: React.ReactNode }) {
  return (
    <section
      data-testid={`currency-block-${currency}`}
      aria-label={`Moneda ${currency}`}
      className="space-y-4 border-t border-border pt-4 first:border-t-0 first:pt-0"
    >
      <Badge tone="primary">{currency}</Badge>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
      <Inbox className="h-5 w-5" aria-hidden="true" />
      <p className="max-w-xs">{children}</p>
    </div>
  );
}

function TodayNote({ children = "Calculado a hoy" }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </p>
  );
}

/** Tarjeta con skeleton y error propios: un endpoint caído no tumba los demás (R5.6). */
function StatementCard({
  title,
  icon: Icon,
  subtitle,
  query,
  children,
  testId,
}: {
  title: string;
  icon: LucideIcon;
  subtitle?: string;
  query: { isLoading: boolean; error: unknown; refetch: () => unknown };
  children: React.ReactNode;
  testId: string;
}) {
  const { isLoading, error, refetch } = query;
  return (
    <Card data-testid={testId} aria-busy={isLoading} className="space-y-5">
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      {isLoading ? (
        <div className="space-y-3" data-testid={`${testId}-loading`}>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : error ? (
        <div role="alert" className="space-y-2 text-sm">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            No se pudo cargar este bloque.
          </p>
          <p className="break-words text-xs text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface-2/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-lg font-semibold tabular-nums",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
      {children}
    </div>
  );
}

const signTone = (n: number) => (n > 0 ? "positive" : n < 0 ? "negative" : undefined);

// ─── Estado de resultados ────────────────────────────────────────────────────

const TOTALS = [
  { key: "income", label: "Ingresos", upIsGood: true },
  { key: "expenses", label: "Gastos", upIsGood: false },
  { key: "investments", label: "Inversiones", upIsGood: true },
  { key: "net", label: "Neto", upIsGood: true },
] as const;

function IncomeBlock({
  s,
  fmt,
  categoryNames,
}: {
  s: IncomeCurrencyStatement;
  fmt: AmountFormatter;
  categoryNames: Record<number, string>;
}) {
  const money = (v: number) => fmt(v, { currency: s.currency });
  const categories = [...s.by_category].sort(
    (a, b) => b.expenses - a.expenses || b.previous_expenses - a.previous_expenses,
  );
  return (
    <CurrencyBlock currency={s.currency}>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {TOTALS.map(({ key, label, upIsGood }) => (
          <Stat
            key={key}
            label={label}
            value={money(s[key])}
            tone={key === "net" ? signTone(s.net) : undefined}
          >
            <dl className="mt-2 space-y-0.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">vs mes anterior</dt>
                <dd>
                  <Delta variance={s.compare.previous_month.variance[key]} upIsGood={upIsGood} />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">vs hace un año</dt>
                <dd>
                  <Delta
                    variance={s.compare.same_month_last_year.variance[key]}
                    upIsGood={upIsGood}
                  />
                </dd>
              </div>
            </dl>
          </Stat>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Gastos fijos <span className="font-medium text-foreground">{money(s.fixed.amount)}</span> (
        {fmtPct(s.fixed.share_pct)}) · variables{" "}
        <span className="font-medium text-foreground">{money(s.variable.amount)}</span> (
        {fmtPct(s.variable.share_pct)})
      </p>

      {categories.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">% del gasto</TableHead>
              <TableHead className="text-right">vs mes anterior</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow
                key={c.category_id ?? "none"}
                data-relevant={c.is_relevant || undefined}
                className={cn(c.is_relevant && "bg-warning/10 font-medium")}
              >
                <TableCell>
                  {summaryCategoryName(c.category_id ?? 0, categoryNames)}
                  {c.is_relevant && (
                    <Badge tone="warning" className="ml-2">
                      Relevante
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(c.expenses)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(c.share_pct)}</TableCell>
                <TableCell className="text-right">
                  <Delta variance={c} upIsGood={false} muted={!c.is_relevant} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {s.by_payment_method.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Por método de pago
          </h3>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {s.by_payment_method.map((p) => (
              <li key={p.payment_method ?? "none"} className="flex justify-between gap-2">
                <span>{paymentMethodLabel(p.payment_method)}</span>
                <span className="tabular-nums">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.reconciliation_adjustments !== 0 && (
        <p className="text-xs text-muted-foreground">
          Incluye ajustes de conciliación por {money(s.reconciliation_adjustments)}
          {s.reconciliation_adjustments > 0 && " (plata que salió sin registrar)"}.
        </p>
      )}
    </CurrencyBlock>
  );
}

function IncomeStatementCard({ period }: { period: StatementPeriod }) {
  const query = useIncomeStatement(period);
  const { data: categories = [] } = useCategories();
  const fmt = useFormattedAmount();
  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])) as Record<number, string>,
    [categories],
  );
  const blocks = query.data?.by_currency ?? [];
  return (
    <StatementCard
      testId="income-card"
      title="Estado de resultados"
      subtitle="Ingresos, gastos e inversiones del mes"
      icon={Receipt}
      query={query}
    >
      {blocks.length === 0 ? (
        <EmptyState>
          Sin movimientos en este mes. Registra ingresos o gastos para ver tus resultados.
        </EmptyState>
      ) : (
        blocks.map((s) => (
          <IncomeBlock key={s.currency} s={s} fmt={fmt} categoryNames={categoryNames} />
        ))
      )}
    </StatementCard>
  );
}

// ─── Flujo de caja ───────────────────────────────────────────────────────────

const FLOW_ROWS = [
  { key: "operating", label: "Operativo (ingresos − gastos)" },
  { key: "investing", label: "Inversión" },
  { key: "debt", label: "Pagos a deuda" },
] as const;

const FIXED_TYPE_LABELS: Record<string, string> = { income: "Ingreso", expense: "Gasto" };

function CashFlowCard({ period }: { period: StatementPeriod }) {
  const query = useCashFlowStatement(period);
  const fmt = useFormattedAmount();
  const blocks = query.data?.by_currency ?? [];
  const upcoming = query.data?.upcoming_fixed ?? [];
  return (
    <StatementCard
      testId="cash-flow-card"
      title="Flujo de caja"
      subtitle="De dónde vino y a dónde fue la plata del mes"
      icon={Waves}
      query={query}
    >
      {blocks.length === 0 ? (
        <EmptyState>Sin flujo de caja en este mes.</EmptyState>
      ) : (
        blocks.map((c) => (
          <CurrencyBlock key={c.currency} currency={c.currency}>
            <dl className="space-y-1.5 text-sm">
              {FLOW_ROWS.map(({ key, label }) => (
                <div key={key} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular-nums">{fmt(c[key], { currency: c.currency })}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-2 border-t border-border pt-1.5 font-semibold">
                <dt>Flujo libre</dt>
                <dd
                  className={cn(
                    "tabular-nums",
                    c.free > 0 && "text-success",
                    c.free < 0 && "text-destructive",
                  )}
                >
                  {fmt(c.free, { currency: c.currency })}
                </dd>
              </div>
            </dl>
          </CurrencyBlock>
        ))
      )}

      <div className="space-y-2 border-t border-border pt-4">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
          Fijos de los próximos 30 días
        </h3>
        <TodayNote />
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes fijos por vencer.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {upcoming.map((f) => (
              <li key={f.transaction_id} className="flex justify-between gap-2">
                <span>
                  {f.description ?? "Sin descripción"}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {FIXED_TYPE_LABELS[f.type] ?? f.type} ·{" "}
                    {f.due_date ? fmtDay(f.due_date) : "sin fecha"}
                  </span>
                </span>
                <span className="tabular-nums">{fmt(f.amount, { currency: f.currency })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StatementCard>
  );
}

// ─── Balance ─────────────────────────────────────────────────────────────────

const ASSET_ROWS = [
  { key: "liquid", label: "Líquidos" },
  { key: "investable", label: "Invertibles" },
  { key: "illiquid", label: "Ilíquidos" },
] as const;

const LIABILITY_ROWS = [
  { key: "short_term", label: "Corto plazo" },
  { key: "long_term", label: "Largo plazo" },
] as const;

function AmountList({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; value: string }[];
  total: string;
}) {
  return (
    <div className="text-sm">
      <h3 className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{title}</h3>
      <dl className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="tabular-nums">{r.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-2 border-t border-border pt-1 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{total}</dd>
        </div>
      </dl>
    </div>
  );
}

function BalanceBlock({ b, fmt }: { b: BalanceCurrencyStatement; fmt: AmountFormatter }) {
  const money = (v: number) => fmt(v, { currency: b.currency });
  return (
    <CurrencyBlock currency={b.currency}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AmountList
          title="Activos"
          rows={ASSET_ROWS.map(({ key, label }) => ({ label, value: money(b.assets[key]) }))}
          total={money(b.assets.total)}
        />
        <AmountList
          title="Pasivos"
          rows={LIABILITY_ROWS.map(({ key, label }) => ({
            label,
            value: money(b.liabilities[key]),
          }))}
          total={money(b.liabilities.total)}
        />
      </div>
      <Stat label="Patrimonio neto" value={money(b.net_worth)} tone={signTone(b.net_worth)} />
    </CurrencyBlock>
  );
}

function CreditCardRow({ c, fmt }: { c: CreditCardLine; fmt: AmountFormatter }) {
  const money = (v: number) => fmt(v, { currency: c.currency });
  return (
    <li
      data-testid={`credit-card-${c.liability_id}`}
      data-high={c.is_high || undefined}
      className={cn(
        "rounded-xl border p-3 text-sm",
        c.is_high ? "border-warning/40 bg-warning/10" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{c.name}</span>
        {c.is_high && (
          <Badge tone="warning">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Uso alto
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Saldo <span className="tabular-nums text-foreground">{money(c.balance)}</span>
        {c.utilization_pct == null ? (
          " · sin cupo registrado"
        ) : (
          <>
            {" · "}
            {fmtPct(c.utilization_pct)} del cupo · disponible{" "}
            <span className="tabular-nums text-foreground">
              {c.available == null ? NO_DATA : money(c.available)}
            </span>
          </>
        )}
      </p>
    </li>
  );
}

/**
 * Una línea por moneda, cada una con su eje: COP y USD en un mismo eje aplanarían la menor y un
 * doble eje confunde. Una sola serie por gráfica, así que no lleva leyenda.
 */
function NetWorthLine({
  currency,
  points,
}: {
  currency: string;
  points: NetWorthEvolutionPoint[];
}) {
  const fmt = useFormattedAmount();
  const hidden = useAmountsHidden();
  const colors = useChartColors();
  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: "line", backgroundColor: "transparent", height: 180, spacing: [8, 8, 4, 8] },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories: points.map((p) => fmtMonth(p.period_end)),
        lineColor: colors.border,
        tickColor: colors.border,
        crosshair: { color: colors.border },
        labels: { style: { color: colors.mutedFg, fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: colors.border,
        gridLineDashStyle: "Dash",
        labels: {
          style: { color: colors.mutedFg, fontSize: "11px" },
          formatter: function () {
            return hidden ? "" : compactFmt.format(Number(this.value));
          },
        },
      },
      tooltip: {
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        borderRadius: 12,
        style: { color: colors.foreground, fontSize: "12px" },
        formatter: function () {
          return `<b>${this.key}</b><br/>Neto: ${fmt(Number(this.y), { currency })}`;
        },
      },
      series: [
        {
          type: "line",
          name: `Neto ${currency}`,
          color: colors.chart1,
          lineWidth: 2,
          marker: { enabled: true, radius: 4, lineWidth: 2, lineColor: colors.card },
          data: points.map((p) => p.net),
        },
      ],
    }),
    [points, currency, colors, fmt, hidden],
  );
  return (
    <div data-testid={`evolution-${currency}`}>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{currency}</p>
      {points.length < 2 ? (
        <p className="rounded-xl bg-surface-2/60 p-3 text-xs text-muted-foreground">
          Hay un solo cierre: la gráfica se llena con cada cierre.
        </p>
      ) : (
        <HighchartsReact highcharts={Highcharts} options={options} />
      )}
      <ul className="sr-only">
        {points.map((p) => (
          <li key={p.period_end}>
            {fmtMonth(p.period_end)}: {fmt(p.net, { currency })}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NetWorthEvolution({ points }: { points: NetWorthEvolutionPoint[] }) {
  const byCurrency = useMemo(() => {
    const map = new Map<string, NetWorthEvolutionPoint[]>();
    for (const p of [...points].sort((a, b) => a.period_end.localeCompare(b.period_end))) {
      map.set(p.currency, [...(map.get(p.currency) ?? []), p]);
    }
    // COP primero, igual que los bloques por moneda del API.
    return [...map].sort(([a], [b]) => Number(b === "COP") - Number(a === "COP"));
  }, [points]);
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
        Evolución del patrimonio
      </h3>
      <p className="text-xs text-muted-foreground">
        Sale de tus cierres mensuales: solo cuentas y pasivos, no incluye activos.
      </p>
      {byCurrency.length === 0 ? (
        <p className="rounded-xl bg-surface-2/60 p-3 text-xs text-muted-foreground">
          Aún no hay cierres: la gráfica se llena con cada cierre.
        </p>
      ) : (
        byCurrency.map(([currency, pts]) => (
          <NetWorthLine key={currency} currency={currency} points={pts} />
        ))
      )}
    </div>
  );
}

function BalanceSheetCard() {
  const query = useBalanceSheet();
  const fmt = useFormattedAmount();
  const data = query.data;
  const blocks = data?.by_currency ?? [];
  const cards = data?.credit_cards ?? [];
  return (
    <StatementCard
      testId="balance-card"
      title="Balance"
      subtitle="Lo que tienes y lo que debes"
      icon={Landmark}
      query={query}
    >
      <TodayNote>Calculado a hoy{data?.as_of ? ` (${fmtDay(data.as_of)})` : ""}</TodayNote>
      {blocks.length === 0 ? (
        <EmptyState>Registra cuentas, activos o deudas para ver tu balance.</EmptyState>
      ) : (
        blocks.map((b) => <BalanceBlock key={b.currency} b={b} fmt={fmt} />)
      )}
      {cards.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
            Tarjetas de crédito
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {cards.map((c) => (
              <CreditCardRow key={c.liability_id} c={c} fmt={fmt} />
            ))}
          </ul>
        </div>
      )}
      <NetWorthEvolution points={data?.evolution.points ?? []} />
    </StatementCard>
  );
}

// ─── Indicadores de salud ────────────────────────────────────────────────────

const withAnnual = (v: number | null) => (v == null ? NO_DATA : `${fmtPct(v)} anual`);

const HEALTH_ROWS: { label: string; value: (h: HealthCurrencyIndicators) => string }[] = [
  {
    label: "Liquidez (líquido / deuda de corto plazo)",
    value: (h) => fmtUnit(h.liquidity_ratio, "veces"),
  },
  {
    label: "Colchón (líquido / gasto mensual)",
    value: (h) => fmtUnit(h.cushion_months, "meses"),
  },
  { label: "Tasa promedio de tus deudas", value: (h) => withAnnual(h.avg_debt_rate_pct) },
  { label: "Rendimiento promedio de lo ahorrado", value: (h) => withAnnual(h.avg_yield_pct) },
  { label: "Apalancamiento (pasivos / activos)", value: (h) => fmtPct(h.leverage_pct) },
];

function FinancialHealthCard({ period }: { period: StatementPeriod }) {
  const query = useFinancialHealth(period);
  const fmt = useFormattedAmount();
  const data = query.data;
  const indicators = data?.by_currency ?? [];
  const leakage = (data?.leakage_12m ?? []).filter((l) => l.amount !== 0);
  return (
    <StatementCard
      testId="health-card"
      title="Indicadores"
      subtitle="Qué tan sanas están tus finanzas"
      icon={HeartPulse}
      query={query}
    >
      <Stat
        label="Cuotas de deuda / ingreso (COP, mes seleccionado)"
        value={fmtPct(data?.debt_payment_to_income_pct ?? null)}
      />
      {leakage.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Plata que salió sin registrar en los últimos 12 meses:{" "}
          {leakage.map((l) => fmt(l.amount, { currency: l.currency })).join(" · ")}
        </p>
      )}
      <div className="space-y-4 border-t border-border pt-4">
        <TodayNote />
        {indicators.length === 0 ? (
          <EmptyState>Registra cuentas o deudas para calcular tus indicadores.</EmptyState>
        ) : (
          indicators.map((h) => (
            <CurrencyBlock key={h.currency} currency={h.currency}>
              <dl className="space-y-1.5 text-sm">
                {HEALTH_ROWS.map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="shrink-0 tabular-nums">{value(h)}</dd>
                  </div>
                ))}
              </dl>
            </CurrencyBlock>
          ))
        )}
      </div>
    </StatementCard>
  );
}

// ─── Vista ───────────────────────────────────────────────────────────────────

export function FinancialStatements() {
  const [month, setMonth] = useQueryState("month", parseAsString);
  const period = useMemo(() => parsePeriod(month), [month]);
  const now = currentPeriod();
  const isCurrent = period.year === now.year && period.month === now.month;
  const isFuture = period.year * 12 + period.month >= now.year * 12 + now.month;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Cada moneda se muestra aparte, sin convertir.
        </p>
        <div className="flex items-center gap-1 rounded-xl bg-surface p-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes anterior"
            disabled={period.year === 2000 && period.month === 1}
            onClick={() => void setMonth(shiftPeriod(period, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p
            aria-live="polite"
            data-testid="statement-period"
            className="min-w-40 text-center text-sm font-medium capitalize"
          >
            {periodLabel(period)}
            {isCurrent && <span className="text-muted-foreground"> (en curso)</span>}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes siguiente"
            disabled={isFuture}
            onClick={() => void setMonth(shiftPeriod(period, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <IncomeStatementCard period={period} />
        <CashFlowCard period={period} />
        <BalanceSheetCard />
        <FinancialHealthCard period={period} />
      </div>
    </div>
  );
}
