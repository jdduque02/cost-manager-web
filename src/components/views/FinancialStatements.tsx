import { useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Receipt,
  Waves,
  type LucideIcon,
} from "lucide-react";
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
import { useCashFlowStatement, useCategories, useIncomeStatement } from "@/lib/hooks/use-api";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { summaryCategoryName } from "@/lib/api/finance";
import {
  paymentMethodLabel,
  type IncomeCurrencyStatement,
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

type AmountFormatter = ReturnType<typeof useFormattedAmount>;

// ─── Periodo (?month=YYYY-MM en la web; al API van year/month) ───────────────

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

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
      </div>
    </div>
  );
}
