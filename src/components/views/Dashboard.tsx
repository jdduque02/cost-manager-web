import {
  ArrowDownRight,
  ArrowUpRight,
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
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Legend,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { Card, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useNetWorth, useTransactions, useCategories } from "@/lib/hooks/use-api";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { useMemo, useState } from "react";
import { TransactionDialog } from "./TransactionDialog";
import { NewsCarousel } from "@/components/ui/news-carousel";

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
        className={cn(
          "mt-1 font-display text-2xl font-semibold tracking-tight",
          positive ? "text-foreground" : "text-foreground",
        )}
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

  const PIE_COLORS = [
    "oklch(0.78 0.17 165)",
    "oklch(0.68 0.20 18)",
    "oklch(0.62 0.19 250)",
    "oklch(0.80 0.15 85)",
    "oklch(0.65 0.22 310)",
    "oklch(0.55 0.20 20)",
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Buenas tardes</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Resumen financiero
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva Transacción
          </button>
        </div>
      </div>

      {/* KPIs */}
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

      {/* News Carousel */}
      <NewsCarousel />

      {/* AI Insight */}
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
                Sincronizando automaticamente tus datos financieros para ofrecer insights en tiempo
                real.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Continua registrando tus transacciones para ver estrategias de ahorro
                personalizadas.
              </p>
            </div>
          </div>
        </div>
      </Card>

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

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer>
              <AreaChart
                data={monthlyChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.17 165)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.78 0.17 165)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.20 18)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.68 0.20 18)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="oklch(0.30 0.014 260)"
                  strokeDasharray="3 6"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="oklch(0.68 0.02 260)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.68 0.02 260)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.014 260)",
                    border: "1px solid oklch(0.30 0.014 260)",
                    borderRadius: 12,
                    color: "oklch(0.97 0.005 260)",
                  }}
                  formatter={(v: number) => fmtAmount(v)}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="oklch(0.78 0.17 165)"
                  strokeWidth={2.5}
                  fill="url(#income)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="oklch(0.68 0.20 18)"
                  strokeWidth={2.5}
                  fill="url(#expense)"
                />
              </AreaChart>
            </ResponsiveContainer>
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
              <li className="py-8 text-center text-sm text-muted-foreground">
                No hay transacciones recientes.
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
                        t.type === "income"
                          ? "bg-success/10 text-success"
                          : t.type === "investment"
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-2 text-muted-foreground",
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
                        t.type === "income"
                          ? "text-success"
                          : t.type === "investment"
                            ? "text-primary"
                            : "text-foreground",
                      )}
                    >
                      {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}
                      {fmtAmount(t.amount)}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </Card>
      </div>

      {/* Spending by category */}
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
              <ResponsiveContainer>
                <BarChart data={categorySpending}>
                  <CartesianGrid
                    stroke="oklch(0.30 0.014 260)"
                    strokeDasharray="3 6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="cat"
                    stroke="oklch(0.68 0.02 260)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="oklch(0.68 0.02 260)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(0.25 0.016 260 / 0.5)" }}
                    contentStyle={{
                      background: "oklch(0.21 0.014 260)",
                      border: "1px solid oklch(0.30 0.014 260)",
                      borderRadius: 12,
                    }}
                    formatter={(v: number) => fmtAmount(v)}
                  />
                  <Bar dataKey="amt" fill="oklch(0.78 0.17 165)" radius={[8, 8, 0, 0]} />
                  <Legend wrapperStyle={{ display: "none" }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No hay datos de gastos para mostrar.
              </div>
            )}
          </div>
          <div className="h-64">
            {categorySpending.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categorySpending}
                    dataKey="amt"
                    nameKey="cat"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {categorySpending.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.21 0.014 260)",
                      border: "1px solid oklch(0.30 0.014 260)",
                      borderRadius: 12,
                    }}
                    formatter={(v: number) => fmtAmount(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No hay datos de gastos para mostrar.
              </div>
            )}
          </div>
        </div>
      </Card>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
