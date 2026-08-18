import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
  PiggyBank,
  type LucideIcon,
  ShoppingBag,
  Coffee,
  Home,
  Car,
  Zap,
  Tag,
} from "lucide-react";
import Highcharts from "@/lib/highcharts";
import HighchartsReact from "highcharts-react-official";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { RevealSection } from "@/components/ui/reveal-section";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { useNetWorth, useTransactions, useCategories } from "@/lib/hooks/use-api";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { useChartColors } from "@/lib/hooks/use-chart-colors";
import { useMemo, useState } from "react";
import { TransactionDialog } from "./TransactionDialog";
import { NewsCarousel } from "@/components/ui/news-carousel";

function kFormatter(this: Highcharts.AxisLabelsFormatterContextObject) {
  const v = Number(this.value);
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;
}

function tooltipHtml(points: Highcharts.Point[], fmt: (v: number) => string) {
  const rows = points
    .map(
      (p) => `
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${p.color}"></span>
          <span>${p.series.name}</span>
          <span style="margin-left:auto;padding-left:16px;font-weight:600">${fmt(p.y ?? 0)}</span>
        </div>`,
    )
    .join("");
  return rows;
}

function pieTooltipHtml(
  key: string | undefined,
  y: number | undefined,
  fmt: (v: number) => string,
) {
  return `<b>${key}</b>: ${fmt(typeof y === "number" ? y : 0)}`;
}

function getTypeIconStyle(type: string): string {
  if (type === "income") return "bg-success/10 text-success";
  if (type === "investment") return "bg-primary/10 text-primary";
  return "bg-surface-2 text-muted-foreground";
}

function getTypeTextStyle(type: string): string {
  if (type === "income") return "text-success";
  if (type === "investment") return "text-primary";
  return "text-foreground";
}

function getAmountSign(type: string): string {
  if (type === "income") return "+";
  if (type === "expense") return "-";
  return "";
}

function getCategoryIcon(categoryName?: string) {
  if (!categoryName) return Tag;
  const c = categoryName.toLowerCase();
  if (
    c.includes("aliment") ||
    c.includes("supermercado") ||
    c.includes("groceries") ||
    c.includes("shopping")
  )
    return ShoppingBag;
  if (
    c.includes("restaurant") ||
    c.includes("dining") ||
    c.includes("cafe") ||
    c.includes("coffee")
  )
    return Coffee;
  if (
    c.includes("vivienda") ||
    c.includes("arriendo") ||
    c.includes("housing") ||
    c.includes("rent")
  )
    return Home;
  if (
    c.includes("transporte") ||
    c.includes("carro") ||
    c.includes("transport") ||
    c.includes("car")
  )
    return Car;
  if (c.includes("servicio") || c.includes("utilities") || c.includes("bills")) return Zap;
  if (c.includes("salario") || c.includes("income") || c.includes("ingreso")) return TrendingUp;
  return Tag;
}

function KPI({
  label,
  value,
  delta,
  positive,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <Badge tone={positive ? "success" : "destructive"}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </Badge>
      </div>
      <p className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={cn("mt-1 font-display text-2xl font-semibold tracking-tight", "text-foreground")}
      >
        {value}
      </p>
    </Card>
  );
}

export function Dashboard() {
  const { data: txs = [] } = useTransactions();
  const { summary: nw } = useNetWorth();
  const { data: categories = [] } = useCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const fmtAmount = useFormattedAmount();

  const netWorthValue = nw?.netWorth ?? 0;

  // Build a map: category_id -> category name
  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  function txDate(t: { transaction_date?: string | null; created_at?: string }): Date {
    const iso = t.transaction_date ?? t.created_at ?? "";
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // Calculate this month's income and expenses
  const now = useMemo(() => new Date(), []);
  const currentMonthTxs = txs.filter((t) => {
    const d = txDate(t);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthlyIncome = currentMonthTxs
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);
  const monthlyExpenses = currentMonthTxs
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);
  const savingsRate =
    monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  // Build monthly chart data from transactions (last 6 months)
  const monthlyChartData = useMemo(() => {
    const months: { month: string; income: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("es-CO", { month: "short" });
      const monthTxs = txs.filter((t) => {
        const td = txDate(t);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      months.push({
        month: label,
        income: monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expenses: monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }
    return months;
  }, [txs, now]);

  // Spending by category
  const categorySpending = useMemo(() => {
    const map: Record<number, number> = {};
    currentMonthTxs
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const catId = t.category_id ?? -1;
        map[catId] = (map[catId] ?? 0) + t.amount;
      });
    return Object.entries(map)
      .map(([catId, amt]) => ({ cat: categoryMap[Number(catId)] ?? "Por editar", amt }))
      .sort((a, b) => b.amt - a.amt)
      .slice(0, 6);
  }, [currentMonthTxs, categoryMap]);

  const colors = useChartColors();
  const PIE_COLORS = [
    colors.chart1,
    colors.chart5,
    colors.chart2,
    colors.chart3,
    colors.chart4,
    colors.destructive,
  ];

  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      style: { color: colors.foreground, fontSize: "12px" },
    }),
    [colors],
  );

  const evolutionOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "area",
        backgroundColor: "transparent",
        height: 288,
        spacing: [10, 12, 6, 12],
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories: monthlyChartData.map((d) => d.month),
        lineColor: colors.border,
        tickColor: colors.border,
        labels: { style: { color: colors.mutedFg, fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: colors.border,
        gridLineDashStyle: "Dash",
        labels: { style: { color: colors.mutedFg, fontSize: "11px" }, formatter: kFormatter },
      },
      tooltip: {
        ...tooltipStyle,
        shared: true,
        useHTML: true,
        formatter: function (this: Highcharts.TooltipFormatterContextObject) {
          return `<div style="font-weight:600;margin-bottom:6px;">${this.x}</div>${tooltipHtml(this.points ?? [], fmtAmount)}`;
        },
      },
      plotOptions: {
        area: {
          fillOpacity: 0.16,
          lineWidth: 2.5,
          marker: { enabled: false, states: { hover: { enabled: true } } },
        },
      },
      series: [
        {
          type: "area",
          name: "Ingresos",
          color: colors.chart1,
          data: monthlyChartData.map((d) => d.income),
        },
        {
          type: "area",
          name: "Gastos",
          color: colors.chart5,
          data: monthlyChartData.map((d) => d.expenses),
        },
      ],
    }),
    [monthlyChartData, colors, tooltipStyle, fmtAmount],
  );

  const spendingOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 256,
        spacing: [10, 12, 6, 12],
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories: categorySpending.map((c) => c.cat),
        lineColor: colors.border,
        tickColor: colors.border,
        labels: { style: { color: colors.mutedFg, fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: colors.border,
        gridLineDashStyle: "Dash",
        labels: { style: { color: colors.mutedFg, fontSize: "11px" }, formatter: kFormatter },
      },
      tooltip: {
        ...tooltipStyle,
        formatter: function (this: Highcharts.TooltipFormatterContextObject) {
          return pieTooltipHtml(this.key, this.y, fmtAmount);
        },
      },
      plotOptions: { column: { borderRadius: 8, pointPadding: 0.08, groupPadding: 0.08 } },
      series: [
        {
          type: "column",
          name: "Gastos",
          color: colors.chart1,
          data: categorySpending.map((c) => c.amt),
        },
      ],
    }),
    [categorySpending, colors, tooltipStyle, fmtAmount],
  );

  const spendingPieOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: "pie", backgroundColor: "transparent", height: 256, spacing: [8, 8, 8, 8] },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: {
        ...tooltipStyle,
        formatter: function (this: Highcharts.TooltipFormatterContextObject) {
          return pieTooltipHtml(this.key, this.y, fmtAmount);
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
            style: { color: colors.mutedFg, fontSize: "11px", textOutline: "none" },
          },
        },
      },
      series: [
        {
          type: "pie",
          data: categorySpending.map((c, i) => ({
            name: c.cat,
            y: c.amt,
            color: PIE_COLORS[i % PIE_COLORS.length],
          })),
        },
      ],
    }),
    [categorySpending, PIE_COLORS, colors, tooltipStyle, fmtAmount],
  );

  return (
    <div className="space-y-7">
      {/* Header */}
      <RevealSection>
        <PageHeader
          title="Resumen financiero"
          subtitle="Buenas tardes"
          actions={
            <Button onClick={() => setDialogOpen(true)} className="shadow-glow">
              <Plus className="h-4 w-4" />
              Nueva Transacción
            </Button>
          }
        />
      </RevealSection>

      {/* KPIs */}
      <RevealSection delay={0}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPI
            label="Patrimonio"
            value={fmtAmount(netWorthValue)}
            delta="Tiempo real"
            positive
            icon={Wallet}
          />
          <KPI
            label="Ingresos del mes"
            value={fmtAmount(monthlyIncome)}
            delta="Este mes"
            positive
            icon={TrendingUp}
          />
          <KPI
            label="Gastos del mes"
            value={fmtAmount(monthlyExpenses)}
            delta="Este mes"
            positive={false}
            icon={ArrowDownRight}
          />
          <KPI
            label="Tasa de ahorro"
            value={`${savingsRate.toFixed(1)}%`}
            delta="Este mes"
            positive={savingsRate > 0}
            icon={PiggyBank}
          />
        </div>
      </RevealSection>

      {/* News Carousel */}
      <RevealSection delay={100}>
        <NewsCarousel />
      </RevealSection>

      {/* AI Insight */}
      <RevealSection delay={200}>
        <Card glow className="relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <Badge tone="primary">Insight de IA</Badge>
                <p className="mt-2 text-base font-medium text-foreground">
                  Sincronizando automaticamente tus datos financieros para ofrecer insights en
                  tiempo real.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Continua registrando tus transacciones para ver estrategias de ahorro
                  personalizadas.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </RevealSection>

      <RevealSection delay={300}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Chart */}
          <Card className="xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Ingresos vs. Gastos</h3>
                <p className="text-sm text-muted-foreground">Ultimos 6 meses</p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Ingresos
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-destructive" /> Gastos
                </span>
              </div>
            </div>

            <div className="mt-6 h-72 w-full px-2">
              <HighchartsReact highcharts={Highcharts} options={evolutionOptions} />
            </div>
          </Card>

          {/* Recent transactions */}
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Actividad Reciente</h3>
              <a href="/transactions" className="text-xs font-medium text-primary hover:underline">
                Ver todo
              </a>
            </div>
            <ul className="mt-4 space-y-1.5">
              {txs.length === 0 ? (
                <li className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2">
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      No hay transacciones recientes
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Registra tu primera transacción para verla aquí
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </Button>
                </li>
              ) : (
                txs.slice(0, 5).map((t) => {
                  const categoryName = categoryMap[t.category_id ?? -1] ?? "Por editar";
                  const Icon = getCategoryIcon(categoryName);

                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          getTypeIconStyle(t.type),
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.description ?? "Sin descripcion"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {categoryName} · {txDate(t).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          getTypeTextStyle(t.type),
                        )}
                      >
                        {getAmountSign(t.type)}
                        {fmtAmount(t.amount)}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>
        </div>
      </RevealSection>

      {/* Spending by category */}
      <RevealSection delay={400}>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Desglose de gastos</h3>
              <p className="text-sm text-muted-foreground">Principales categorias este periodo</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-64">
              {categorySpending.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={spendingOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No hay datos de gastos para mostrar.
                </div>
              )}
            </div>
            <div className="h-64">
              {categorySpending.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={spendingPieOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No hay datos de gastos para mostrar.
                </div>
              )}
            </div>
          </div>
        </Card>
      </RevealSection>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
