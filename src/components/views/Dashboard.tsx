import { ArrowDownRight, ArrowUpRight, Plus, Sparkles, TrendingUp, Wallet, PiggyBank, type LucideIcon, ShoppingBag, Coffee, Home, Car, Zap, Tag } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Legend } from "recharts";
import { Card, Badge } from "@/components/ui/primitives";
import { fmtCurrency } from "@/lib/format";
import { monthly } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { useNetWorth, useTransactions } from "@/lib/hooks/use-api";

function getCategoryIcon(category?: string) {
  if (!category) return Tag;
  const c = category.toLowerCase();
  if (c.includes("groceries") || c.includes("shopping")) return ShoppingBag;
  if (c.includes("dining") || c.includes("coffee") || c.includes("restaurant")) return Coffee;
  if (c.includes("housing") || c.includes("rent")) return Home;
  if (c.includes("transport") || c.includes("car")) return Car;
  if (c.includes("utilities") || c.includes("bills")) return Zap;
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
      <p className={cn("mt-1 font-display text-2xl font-semibold tracking-tight", positive ? "text-foreground" : "text-foreground")}>
        {value}
      </p>
    </Card>
  );
}

export function Dashboard() {
  const { data: txs = [] } = useTransactions();
  const { data: nw } = useNetWorth();

  const netWorthValue = nw?.summary?.netWorth ?? 0;
  
  // Calculate this month's income and expenses
  const now = new Date();
  const currentMonthTxs = txs.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthlyIncome = currentMonthTxs.filter(t => t.type === "INCOME").reduce((acc, t) => acc + t.amount, 0);
  const monthlyExpenses = currentMonthTxs.filter(t => t.type === "EXPENSE").reduce((acc, t) => acc + t.amount, 0);
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Buenas tardes 👋</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Resumen financiero</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
            <Plus className="h-4 w-4" />
            Nueva Transacción
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI label="Patrimonio" value={fmtCurrency(netWorthValue)} delta="Tiempo real" positive icon={Wallet} />
        <KPI label="Ingresos del mes" value={fmtCurrency(monthlyIncome)} delta="Este mes" positive icon={TrendingUp} />
        <KPI label="Gastos del mes" value={fmtCurrency(monthlyExpenses)} delta="Este mes" positive={false} icon={ArrowDownRight} />
        <KPI label="Tasa de ahorro" value={`${savingsRate.toFixed(1)}%`} delta="Este mes" positive={savingsRate > 0} icon={PiggyBank} />
      </div>

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
                💡 Sincronizando automáticamente tus datos financieros para ofrecer insights en tiempo real.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Continúa registrando tus transacciones para ver estrategias de ahorro personalizadas.
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
              <p className="text-sm text-muted-foreground">Últimos 6 meses (Datos de prueba)</p>
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
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                <CartesianGrid stroke="oklch(0.30 0.014 260)" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.68 0.02 260)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 260)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.014 260)",
                    border: "1px solid oklch(0.30 0.014 260)",
                    borderRadius: 12,
                    color: "oklch(0.97 0.005 260)",
                  }}
                  formatter={(v: number) => fmtCurrency(v)}
                />
                <Area type="monotone" dataKey="income" stroke="oklch(0.78 0.17 165)" strokeWidth={2.5} fill="url(#income)" />
                <Area type="monotone" dataKey="expenses" stroke="oklch(0.68 0.20 18)" strokeWidth={2.5} fill="url(#expense)" />
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
              <li className="py-8 text-center text-sm text-muted-foreground">No hay transacciones recientes.</li>
            ) : (
              txs.slice(0, 5).map((t) => {
                const Icon = getCategoryIcon(t.category);
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      t.type === "INCOME" ? "bg-success/10 text-success" : "bg-surface-2 text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.category ?? "General"} · {new Date(t.date).toLocaleDateString("es-CO")}</p>
                    </div>
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      t.type === "INCOME" ? "text-success" : "text-foreground"
                    )}>
                      {t.type === "INCOME" ? "+" : "−"}{fmtCurrency(t.amount)}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </Card>
      </div>

      {/* Spending by category quick chart */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Desglose de gastos</h3>
            <p className="text-sm text-muted-foreground">Principales categorías este período (Datos de prueba)</p>
          </div>
        </div>
        <div className="mt-6 h-64">
          <ResponsiveContainer>
            <BarChart data={[
              { cat: "Housing", amt: 1850 },
              { cat: "Dining", amt: 690 },
              { cat: "Groceries", amt: 540 },
              { cat: "Transport", amt: 320 },
              { cat: "Subscriptions", amt: 180 },
              { cat: "Travel", amt: 800 },
            ]}>
              <CartesianGrid stroke="oklch(0.30 0.014 260)" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="cat" stroke="oklch(0.68 0.02 260)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.68 0.02 260)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                cursor={{ fill: "oklch(0.25 0.016 260 / 0.5)" }}
                contentStyle={{
                  background: "oklch(0.21 0.014 260)",
                  border: "1px solid oklch(0.30 0.014 260)",
                  borderRadius: 12,
                }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Bar dataKey="amt" fill="oklch(0.78 0.17 165)" radius={[8, 8, 0, 0]} />
              <Legend wrapperStyle={{ display: "none" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
