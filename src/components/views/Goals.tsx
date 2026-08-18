import { useState, useMemo } from "react";
import { Card, Badge } from "@/components/ui/primitives";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { Plane, Home, GraduationCap, Car, Tag, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  useObjectives,
  useDeleteObjective,
  useTransactions,
  useCategories,
} from "@/lib/hooks/use-api";
import { GoalDialog } from "./GoalDialog";
import { TransactionsDetailModal } from "./TransactionsDetailModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FinancialObjective, TransactionRecord } from "@/lib/api/finance";

function getGoalIcon(name?: string) {
  if (!name) return Tag;
  const n = name.toLowerCase();
  if (n.includes("viaje") || n.includes("trip") || n.includes("travel")) return Plane;
  if (n.includes("casa") || n.includes("vivienda") || n.includes("home") || n.includes("apartment"))
    return Home;
  if (n.includes("educacion") || n.includes("school") || n.includes("mba") || n.includes("college"))
    return GraduationCap;
  if (n.includes("carro") || n.includes("auto") || n.includes("car")) return Car;
  return Tag;
}

function getTransactionMeta(type: string) {
  if (type === "income") return { color: "text-success", sign: "+" };
  if (type === "investment") return { color: "text-primary", sign: "" };
  return { color: "text-destructive", sign: type === "expense" ? "-" : "" };
}

function GoalCard({
  goal,
  linkedTransactions,
  categoryMap,
  fmtAmount,
  onEdit,
  onDelete,
  onShowDetails,
}: {
  goal: FinancialObjective;
  linkedTransactions: TransactionRecord[];
  categoryMap: Map<number, string>;
  fmtAmount: (v: number) => string;
  onEdit: (g: FinancialObjective) => void;
  onDelete: (g: FinancialObjective) => void;
  onShowDetails: (v: { goal: FinancialObjective; transactions: TransactionRecord[] }) => void;
}) {
  const saved = goal.current_balance ?? 0;
  const pct = Math.min((saved / (goal.target_amount || 1)) * 100, 100);
  const Icon = getGoalIcon(goal.name);
  const isComplete = goal.is_completed;
  const linkedCount = linkedTransactions.length;

  return (
    <Card glow={isComplete} className="group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">{goal.name}</h3>
            <p className="text-xs text-muted-foreground">{Math.round(pct)}% completada</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isComplete ? (
            <Badge tone="success">Meta completada</Badge>
          ) : (
            <Badge tone="primary">{goal.type}</Badge>
          )}
          <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100 ml-2">
            <button
              onClick={() => onEdit(goal)}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(goal)}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="font-display text-xl font-semibold tabular-nums">
          {fmtAmount(saved)}
        </span>
        <span className="text-sm text-muted-foreground">
          de {fmtAmount(goal.target_amount)}
        </span>
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        <p className="text-xs font-medium text-muted-foreground">
          Transacciones vinculadas ({linkedCount})
        </p>
        <div className="mt-2 space-y-1.5">
          {linkedTransactions.slice(0, 3).map((t) => {
            const { color, sign } = getTransactionMeta(t.type);
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-muted-foreground">
                  {t.description ??
                    categoryMap.get(t.category_id ?? -1) ??
                    "Sin descripción"}
                </span>
                <span className={cn("shrink-0 tabular-nums font-medium", color)}>
                  {sign}
                  {fmtAmount(t.amount)}
                </span>
              </div>
            );
          })}
          {linkedCount === 0 && (
            <p className="text-xs text-muted-foreground/70">
              Sin transacciones vinculadas
            </p>
          )}
          {linkedCount > 3 && (
            <p className="text-xs text-muted-foreground/70">
              +{linkedCount - 3} más
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onShowDetails({ goal, transactions: linkedTransactions })}
        className="mt-3 w-full rounded-lg border border-border/60 py-2 text-xs font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
      >
        Ver detalles ({linkedCount})
      </button>
    </Card>
  );
}

export function Goals() {
  const { data: objectives = [], isLoading } = useObjectives();
  const { data: transactions = [] } = useTransactions({ limit: 500 });
  const { data: categories = [] } = useCategories();
  const deleteObj = useDeleteObjective();
  const fmtAmount = useFormattedAmount();

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const linkedByGoal = useMemo(() => {
    const map = new Map<number, typeof transactions>();
    for (const t of transactions) {
      if (t.objective_id == null) continue;
      const list = map.get(t.objective_id) ?? [];
      list.push(t);
      map.set(t.objective_id, list);
    }
    map.forEach((list) =>
      list.sort((a, b) => (b.transaction_date ?? "").localeCompare(a.transaction_date ?? "")),
    );
    return map;
  }, [transactions]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialObjective | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<FinancialObjective | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<{
    goal: FinancialObjective;
    transactions: TransactionRecord[];
  } | null>(null);

  function handleEdit(goal: FinancialObjective) {
    setEditingGoal(goal);
    setDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (!deletingGoal) return;
    deleteObj.mutate(String(deletingGoal.id), {
      onSuccess: () => {
        toast.success("Meta eliminada");
        setDeletingGoal(null);
      },
      onError: () => toast.error("Error al eliminar la meta"),
    });
  }

  function handleDialogClose(v: boolean) {
    setDialogOpen(v);
    if (!v) setEditingGoal(null);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Metas</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Ahorrando para lo que importa
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva Meta
        </button>
      </div>

      {isLoading && (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!isLoading && objectives.length === 0 && (
        <div className="flex h-32 flex-col items-center justify-center text-muted-foreground text-sm">
          <Tag className="mb-2 h-6 w-6 opacity-50" />
          No se encontraron metas financieras.
        </div>
      )}

      {!isLoading && objectives.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {objectives.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              linkedTransactions={linkedByGoal.get(g.id) ?? []}
              categoryMap={categoryMap}
              fmtAmount={fmtAmount}
              onEdit={handleEdit}
              onDelete={setDeletingGoal}
              onShowDetails={setDetailsTarget}
            />
          ))}
        </div>
      )}

      <TransactionsDetailModal
        open={!!detailsTarget}
        onOpenChange={(v) => {
          if (!v) setDetailsTarget(null);
        }}
        title={detailsTarget?.goal.name ?? ""}
        subtitle={
          detailsTarget
            ? `Saldo actual: ${fmtAmount(detailsTarget.goal.current_balance ?? 0)}`
            : undefined
        }
        transactions={detailsTarget?.transactions ?? []}
        categoryMap={categoryMap}
      />

      <GoalDialog open={dialogOpen} onOpenChange={handleDialogClose} goal={editingGoal} />

      <ConfirmDialog
        open={!!deletingGoal}
        onOpenChange={(v) => {
          if (!v) setDeletingGoal(null);
        }}
        title="Eliminar meta"
        description={`¿Estás seguro de eliminar la meta "${deletingGoal?.name ?? ""}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        loading={deleteObj.isPending}
      />
    </div>
  );
}
