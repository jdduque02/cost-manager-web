import { Card, Badge } from "@/components/ui/primitives";
import { budget } from "@/lib/mock";
import { fmtCurrency } from "@/lib/format";
import { FileText, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

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
              <p className="text-sm text-muted-foreground">Tu asignación ideal vs. gasto real</p>
            </div>
            <Badge tone="primary"><Sparkles className="h-3 w-3" /> Guía de IA</Badge>
          </div>
          <div className="mt-6 space-y-6">
            {budget.map((b) => (
              <BudgetBar key={b.name} {...b} />
            ))}
          </div>
        </Card>

        <Card glow className="relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <Badge tone="primary">DIAN · Colombia</Badge>
              <h3 className="mt-1 font-display text-lg font-semibold">Proyección de Impuestos 2026</h3>
            </div>
          </div>

          <dl className="mt-6 space-y-4">
            <div className="flex items-end justify-between border-b border-border pb-3">
              <dt className="text-sm text-muted-foreground">Patrimonio Neto (UVT)</dt>
              <dd className="text-right">
                <p className="font-display text-lg font-semibold">7,412 UVT</p>
                <p className="text-xs text-muted-foreground">≈ {fmtCurrency(89650)}</p>
              </dd>
            </div>
            <div className="flex items-end justify-between border-b border-border pb-3">
              <dt className="text-sm text-muted-foreground">Ingreso Anual (UVT)</dt>
              <dd className="text-right">
                <p className="font-display text-lg font-semibold">6,748 UVT</p>
                <p className="text-xs text-muted-foreground">≈ {fmtCurrency(81600)}</p>
              </dd>
            </div>
            <div className="flex items-end justify-between">
              <dt className="text-sm text-muted-foreground">Obligación de declaración</dt>
              <dd>
                <Badge tone="warning">Requerida</Badge>
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
            { t: "Oportunidad de refinanciación", d: "Refinanciar tu préstamo de auto podría ahorrarte ~$1,240/año con las tasas actuales." },
            { t: "Ahorro redondeado", d: "Activa los redondeos para invertir spare change. Estimado +$38/mes a tu portafolio." },
            { t: "Auditoría de suscripciones", d: "3 suscripciones sin usar por 60+ días. Cancela para recuperar $42/mes." },
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
