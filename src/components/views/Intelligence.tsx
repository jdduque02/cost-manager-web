import { Card, Badge } from "@/components/ui/primitives";
import { fmtCurrency } from "@/lib/format";
import { FileText, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinancialBudgetProfile, useTransactions, useTaxSummary } from "@/lib/hooks/use-api";
import { useMemo } from "react";

function BudgetBar({ name, actual, limit, tone }: { name: string; actual: number; limit: number; tone: string }) {
  const pct = Math.min((actual / limit) * 100, 130);
  const over = actual > limit;
  const colorClass: Record<string, string> = {
    primary: "bg-primary",
    destructive: "bg-destructive",
    warning: "bg-warning",
  };
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="tabular-nums text-muted-foreground">
          {fmtCurrency(actual)} <span className="text-muted-foreground/60">/ {fmtCurrency(limit)}</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-all", colorClass[tone])}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs">
        <span className="text-muted-foreground">{Math.round((actual / limit) * 100)}% usado</span>
        {over ? <Badge tone="destructive">Sobre presupuesto</Badge> : <Badge tone="success">En camino</Badge>}
      </div>
    </div>
  );
}

export function Intelligence() {
  const { data: profile, isLoading: loadProfile } = useFinancialBudgetProfile();
  const { data: txs = [], isLoading: loadTxs } = useTransactions();
  const { data: taxSummary, isLoading: loadTax } = useTaxSummary();

  const isLoading = loadProfile || loadTxs || loadTax;

  const budgetData = useMemo(() => {
    if (!profile) return null;

    const now = new Date();
    const currentMonthTxs = txs.filter((t) => {
      const d = new Date(t.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const monthlyIncome = currentMonthTxs.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const monthlyExpenses = currentMonthTxs.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);

    const needsLimit = monthlyIncome * (profile.needs_ratio / 100);
    const wantsLimit = monthlyIncome * (profile.wants_ratio / 100);
    const savingsLimit = monthlyIncome * (profile.savings_ratio / 100);

    // Simple split: 60% of expenses are needs, 40% are wants
    const needsActual = monthlyExpenses * 0.6;
    const wantsActual = monthlyExpenses * 0.4;
    const savingsActual = monthlyIncome - monthlyExpenses;

    return [
      { name: `Necesidades (${profile.needs_ratio}%)`, actual: needsActual, limit: needsLimit, tone: "primary" },
      { name: `Deseos (${profile.wants_ratio}%)`, actual: wantsActual, limit: wantsLimit, tone: "destructive" },
      { name: `Ahorros (${profile.savings_ratio}%)`, actual: savingsActual, limit: savingsLimit, tone: "warning" },
    ];
  }, [profile, txs]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Inteligencia e Impuestos</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Presupuesto inteligente y proyecciones</h1>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Regla 50 / 30 / 20</h3>
              <p className="text-sm text-muted-foreground">Tu asignacion ideal vs. gasto real</p>
            </div>
            <Badge tone="primary"><Sparkles className="h-3 w-3" /> Guia de IA</Badge>
          </div>
          <div className="mt-6 space-y-6">
            {budgetData ? (
              budgetData.map((b) => (
                <BudgetBar key={b.name} {...b} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Configura tu perfil financiero para ver el desglose 50/30/20.</p>
            )}
          </div>
        </Card>

        <Card glow className="relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <Badge tone="primary">DIAN - Colombia</Badge>
              <h3 className="mt-1 font-display text-lg font-semibold">Proyeccion de Impuestos {taxSummary?.fiscal_year ?? 2026}</h3>
            </div>
          </div>

          <dl className="mt-6 space-y-4">
            <div className="flex items-end justify-between border-b border-border pb-3">
              <dt className="text-sm text-muted-foreground">Patrimonio Neto (UVT)</dt>
              <dd className="text-right">
                <p className="font-display text-lg font-semibold">{taxSummary?.assets_in_uvt ? Math.round(taxSummary.assets_in_uvt).toLocaleString() : "N/A"} UVT</p>
                <p className="text-xs text-muted-foreground">{taxSummary?.patrimony ? fmtCurrency(taxSummary.patrimony) : "N/A"}</p>
              </dd>
            </div>
            <div className="flex items-end justify-between border-b border-border pb-3">
              <dt className="text-sm text-muted-foreground">Ingreso Anual (UVT)</dt>
              <dd className="text-right">
                <p className="font-display text-lg font-semibold">{taxSummary?.income_in_uvt ? Math.round(taxSummary.income_in_uvt).toLocaleString() : "N/A"} UVT</p>
                <p className="text-xs text-muted-foreground">{taxSummary?.total_income ? fmtCurrency(taxSummary.total_income) : "N/A"}</p>
              </dd>
            </div>
            <div className="flex items-end justify-between">
              <dt className="text-sm text-muted-foreground">Obligacion de declaracion</dt>
              <dd>
                {taxSummary?.must_declare ? (
                  <Badge tone="warning">Requerida</Badge>
                ) : (
                  <Badge tone="success">No requerida</Badge>
                )}
              </dd>
            </div>
          </dl>

          <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm font-medium hover:bg-surface">
            <ShieldCheck className="h-4 w-4 text-primary" /> Generar informe de impuestos
          </button>
        </Card>
      </div>

      <Card>
        <h3 className="font-display text-lg font-semibold">Recomendaciones de IA</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { t: "Oportunidad de refinanciacion", d: "Refinanciar tu prestamo de auto podria ahorrarte ~$1,240/anio con las tasas actuales." },
            { t: "Ahorro redondeado", d: "Activa los redondeos para invertir spare change. Estimado +$38/mes a tu portafolio." },
            { t: "Auditoria de suscripciones", d: "3 suscripciones sin usar por 60+ dias. Cancela para recuperar $42/mes." },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-border bg-surface/40 p-4">
              <Badge tone="primary"><Sparkles className="h-3 w-3" /> Insight</Badge>
              <p className="mt-3 font-medium">{x.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
