import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Loader2,
  PiggyBank,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Highcharts from "@/lib/highcharts";
import HighchartsReact from "highcharts-react-official";
import { Card, Badge } from "@/components/ui/primitives";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { useTransactionSummary, useCategories } from "@/lib/hooks/use-api";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { useChartColors } from "@/lib/hooks/use-chart-colors";
import type { TransactionGroupBy } from "@/lib/api/finance";

function reportsKFormatter(this: Highcharts.AxisLabelsFormatterContextObject) {
  const v = Number(this.value);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
}

function reportsTooltipHtml(
  points: Highcharts.Point[],
  fmt: (v: number) => string,
  xLabel: string | number | undefined,
) {
  const rows = points
    .map(
      (p) => `
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${p.color}"></span>
          <span style="text-transform:capitalize">${p.series.name}</span>
          <span style="margin-left:auto;padding-left:16px;font-weight:600">${fmt(p.y ?? 0)}</span>
        </div>`,
    )
    .join("");
  return `<div style="font-weight:600;margin-bottom:6px;">${xLabel}</div>${rows}`;
}

const presets = [
  { id: "this-month", label: "Este mes" },
  { id: "last-month", label: "Mes pasado" },
  { id: "last-7d", label: "Últimos 7 días" },
  { id: "last-30d", label: "Últimos 30 días" },
  { id: "this-year", label: "Este año" },
  { id: "custom", label: "Personalizado" },
] as const;

type PresetId = (typeof presets)[number]["id"];

const groupByOptions: { id: TransactionGroupBy; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
];

function presetRange(preset: PresetId, customFrom?: Date, customTo?: Date) {
  const now = new Date();
  switch (preset) {
    case "this-month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case "last-7d":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
        to: now,
      };
    case "last-30d":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
        to: now,
      };
    case "this-year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "custom":
    default:
      return { from: customFrom ?? now, to: customTo ?? now };
  }
}

function suggestedGroupBy(days: number): TransactionGroupBy {
  if (days <= 35) return "day";
  if (days <= 180) return "week";
  return "month";
}

type KpiTone = "income" | "expense" | "investment" | "neutral";

function kpiIconStyle(tone: KpiTone): string {
  if (tone === "income") return "bg-success/10 text-success";
  if (tone === "expense") return "bg-destructive/10 text-destructive";
  if (tone === "investment") return "bg-primary/10 text-primary";
  return "bg-surface-2 text-foreground";
}

function kpiBadgeTone(tone: KpiTone): "success" | "destructive" | "muted" {
  if (tone === "income") return "success";
  if (tone === "expense") return "destructive";
  return "muted";
}

function KpiCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone: KpiTone;
  icon: typeof TrendingUp;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            kpiIconStyle(tone),
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <Badge tone={kpiBadgeTone(tone)}>
          {hint}
        </Badge>
      </div>
      <p className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </Card>
  );
}

export function Reports() {
  const [preset, setPreset] = useState<PresetId>("this-month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [groupBy, setGroupBy] = useState<TransactionGroupBy>("day");
  const { data: categories = [] } = useCategories();
  const fmtAmount = useFormattedAmount();
  const chartColors = useChartColors();

  const range = useMemo(
    () => presetRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );
  const diffDays = useMemo(
    () => Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1),
    [range],
  );

  useEffect(() => {
    setGroupBy(suggestedGroupBy(diffDays));
  }, [diffDays]);

  const query = useMemo(
    () => ({
      date_from: format(range.from, "yyyy-MM-dd"),
      date_to: format(range.to, "yyyy-MM-dd"),
      group_by: groupBy,
    }),
    [range, groupBy],
  );

  const { data, isLoading, error } = useTransactionSummary(query);

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  const totals = data?.totals;
  const balance = (totals?.income ?? 0) - (totals?.expenses ?? 0) - (totals?.investments ?? 0);

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((s) => ({
        label: s.label,
        income: s.income,
        expenses: s.expenses,
        investments: s.investments,
      })),
    [data],
  );

  const categoryBreakdown = useMemo(
    () =>
      [...(data?.by_category ?? [])]
        .sort((a, b) => b.expenses - a.expenses)
        .map((c) => ({ ...c, name: categoryMap[c.category_id] ?? `Categoría ${c.category_id}` })),
    [data, categoryMap],
  );
  const maxCategory = categoryBreakdown.length
    ? Math.max(...categoryBreakdown.map((c) => c.expenses))
    : 0;

  const PIE_COLORS = useMemo(
    () => [
      chartColors.chart1,
      chartColors.chart5,
      chartColors.chart2,
      chartColors.chart3,
      chartColors.chart4,
      chartColors.destructive,
    ],
    [chartColors],
  );

  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: chartColors.card,
      borderColor: chartColors.cardBorder,
      borderRadius: 12,
      style: { color: chartColors.foreground, fontSize: "12px" },
    }),
    [chartColors],
  );

  const evolutionOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 288,
        spacing: [10, 12, 6, 12],
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: {
        itemStyle: { color: chartColors.mutedFg },
        itemHoverStyle: { color: chartColors.foreground },
        symbolRadius: 8,
      },
      xAxis: {
        categories: chartData.map((d) => d.label),
        lineColor: chartColors.border,
        tickColor: chartColors.border,
        labels: { style: { color: chartColors.mutedFg, fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: chartColors.border,
        gridLineDashStyle: "Dash",
        labels: {
          style: { color: chartColors.mutedFg, fontSize: "11px" },
          formatter: reportsKFormatter,
        },
      },
      tooltip: {
        ...tooltipStyle,
        shared: true,
        useHTML: true,
        formatter: function (this: Highcharts.TooltipFormatterContextObject) {
          return reportsTooltipHtml(this.points ?? [], fmtAmount, this.x);
        },
      },
      plotOptions: {
        column: {
          borderRadius: 4,
          grouping: true,
          pointPadding: 0.08,
          groupPadding: 0.08,
        },
      },
      series: [
        {
          type: "column",
          name: "Ingresos",
          color: chartColors.chart1,
          data: chartData.map((d) => d.income),
        },
        {
          type: "column",
          name: "Gastos",
          color: chartColors.chart5,
          data: chartData.map((d) => d.expenses),
        },
        {
          type: "column",
          name: "Inversiones",
          color: chartColors.chart2,
          data: chartData.map((d) => d.investments),
        },
      ],
    }),
    [chartData, chartColors, tooltipStyle, fmtAmount],
  );

  const pieOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: "pie", backgroundColor: "transparent", height: 256, spacing: [8, 8, 8, 8] },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: {
        ...tooltipStyle,
        formatter: function (this: Highcharts.TooltipFormatterContextObject) {
          return `<b>${this.key}</b>: ${fmtAmount(typeof this.y === "number" ? this.y : 0)}`;
        },
      },
      plotOptions: {
        pie: {
          innerSize: "60%",
          paddingAngle: 3,
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            format: "{point.name}",
            distance: 10,
            style: { color: chartColors.mutedFg, fontSize: "11px", textOutline: "none" },
          },
        },
      },
      series: [
        {
          type: "pie",
          data: categoryBreakdown.map((c, i) => ({
            name: c.name,
            y: c.expenses,
            color: PIE_COLORS[i % PIE_COLORS.length],
          })),
        },
      ],
    }),
    [categoryBreakdown, PIE_COLORS, tooltipStyle, fmtAmount, chartColors],
  );

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Resúmenes y comparativas</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Reportes</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-medium transition",
                preset === p.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl bg-surface p-1">
          {groupByOptions.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupBy(g.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                groupBy === g.id
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {preset === "custom" && (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Desde</p>
            <DatePicker
              value={customFrom}
              onChange={(d) => setCustomFrom(d ?? undefined)}
              placeholder="Seleccionar"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Hasta</p>
            <DatePicker
              value={customTo}
              onChange={(d) => setCustomTo(d ?? undefined)}
              placeholder="Seleccionar"
            />
          </div>
          <p className="text-xs text-muted-foreground sm:pb-2">{diffDays} días seleccionados</p>
        </Card>
      )}

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-destructive">
          <p>Error al cargar el resumen.</p>
          <p className="max-w-md break-words text-xs text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Ingresos"
              value={fmtAmount(totals?.income ?? 0)}
              hint={diffDays <= 31 ? "Día" : "Periodo"}
              tone="income"
              icon={TrendingUp}
            />
            <KpiCard
              label="Gastos"
              value={fmtAmount(totals?.expenses ?? 0)}
              hint="Periodo"
              tone="expense"
              icon={ArrowDownRight}
            />
            <KpiCard
              label="Inversiones"
              value={fmtAmount(totals?.investments ?? 0)}
              hint="Periodo"
              tone="investment"
              icon={PiggyBank}
            />
            <KpiCard
              label="Balance"
              value={fmtAmount(balance)}
              hint="Ing. - Gastos - Inv."
              tone="neutral"
              icon={Wallet}
            />
            <KpiCard
              label="Transacciones"
              value={String(totals?.count ?? 0)}
              hint="Total"
              tone="neutral"
              icon={ReceiptText}
            />
          </div>

          <Card className="p-0">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <BarChart3 className="h-4.5 w-4.5 text-primary" size={18} />
              <h3 className="font-display text-lg font-semibold">Evolución</h3>
            </div>
            <div className="h-72 w-full px-2 py-4">
              <HighchartsReact highcharts={Highcharts} options={evolutionOptions} />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Gastos por categoría</h3>
              <Badge tone="muted">{categoryBreakdown.length} categorías</Badge>
            </div>
            {categoryBreakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin gastos en el periodo seleccionado.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ul className="space-y-3">
                  {categoryBreakdown.map((c) => (
                    <li key={c.category_id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{c.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmtAmount(c.expenses)} · {c.count} mov.
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-destructive/70 transition-all duration-300 ease-out"
                          style={{
                            width: maxCategory ? `${(c.expenses / maxCategory) * 100}%` : "0%",
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="h-64">
                  <HighchartsReact highcharts={Highcharts} options={pieOptions} />
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/60 p-4 text-sm">
        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Los reportes agrupan transacciones por su fecha de transacción, del primer al último día
          del periodo seleccionado. Inversiones se muestran por separado.
        </p>
      </div>
    </div>
  );
}
