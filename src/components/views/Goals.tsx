import { Card, Badge } from "@/components/ui/primitives";
import { fmtCurrency } from "@/lib/format";
import { Plane, Home, GraduationCap, Car, Tag, Loader2 } from "lucide-react";
import { useObjectives } from "@/lib/hooks/use-api";

function getGoalIcon(name?: string) {
  if (!name) return Tag;
  const n = name.toLowerCase();
  if (n.includes("trip") || n.includes("travel")) return Plane;
  if (n.includes("home") || n.includes("apartment") || n.includes("house")) return Home;
  if (n.includes("school") || n.includes("mba") || n.includes("college")) return GraduationCap;
  if (n.includes("car") || n.includes("auto")) return Car;
  return Tag;
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
            // The API doesn't have a direct 'saved' amount on ObjectiveRecord yet, 
            // so we assume 0 or maybe there's a payments array. 
            // For now, if we don't have it, we fallback to 0.
            const saved = 0; // Replace with actual payments sum if added to backend
            const pct = Math.min((saved / (g.targetAmount || 1)) * 100, 100);
            const Icon = getGoalIcon(g.name);
            const isComplete = g.status === "ACHIEVED";
            
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
                    <Badge tone="primary">{g.status}</Badge>
                  )}
                </div>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-display text-xl font-semibold tabular-nums">{fmtCurrency(saved)}</span>
                  <span className="text-sm text-muted-foreground">of {fmtCurrency(g.targetAmount)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
