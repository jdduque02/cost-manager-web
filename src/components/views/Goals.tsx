import { Card, Badge } from "@/components/ui/primitives";
import { fmtCurrency } from "@/lib/format";
import { Plane, Home, GraduationCap, Car, Tag, Loader2 } from "lucide-react";
import { useObjectives, useObjectivePayments } from "@/lib/hooks/use-api";

function getGoalIcon(name?: string) {
  if (!name) return Tag;
  const n = name.toLowerCase();
  if (n.includes("viaje") || n.includes("trip") || n.includes("travel")) return Plane;
  if (n.includes("casa") || n.includes("vivienda") || n.includes("home") || n.includes("apartment")) return Home;
  if (n.includes("educacion") || n.includes("school") || n.includes("mba") || n.includes("college")) return GraduationCap;
  if (n.includes("carro") || n.includes("auto") || n.includes("car")) return Car;
  return Tag;
}

function useObjectivePayments(objectiveId: number) {
  // This is a simple wrapper - in a real app you'd use a proper hook
  return { data: [] as Array<{ amount: number }> };
}

export function Goals() {
  const { data: objectives = [], isLoading } = useObjectives();

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Metas</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Ahorrando para lo que importa</h1>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : objectives.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center text-muted-foreground text-sm">
          <Tag className="mb-2 h-6 w-6 opacity-50" />
          No se encontraron metas financieras.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {objectives.map((g) => {
            const saved = g.current_balance ?? 0;
            const pct = Math.min((saved / (g.target_amount || 1)) * 100, 100);
            const Icon = getGoalIcon(g.name);
            const isComplete = g.is_completed;

            return (
              <Card key={g.id} glow={isComplete}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                      <p className="text-xs text-muted-foreground">{Math.round(pct)}% completada</p>
                    </div>
                  </div>
                  {isComplete ? (
                    <Badge tone="success">Meta completada</Badge>
                  ) : (
                    <Badge tone="primary">{g.type}</Badge>
                  )}
                </div>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-display text-xl font-semibold tabular-nums">{fmtCurrency(saved)}</span>
                  <span className="text-sm text-muted-foreground">de {fmtCurrency(g.target_amount)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
