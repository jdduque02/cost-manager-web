import { useState, useMemo } from "react";
import { Card, Badge } from "@/components/ui/primitives";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import {
  Search,
  ShoppingBag,
  Coffee,
  Home,
  Car,
  Zap,
  Tag,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions, useCategories, useDeleteTransaction } from "@/lib/hooks/use-api";
import { TransactionDialog } from "./TransactionDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import type { TransactionRecord } from "@/lib/api/finance";

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
  return Tag;
}

export function TransactionsList() {
  const { data: transactions = [], isLoading, error } = useTransactions();
  const { data: categories = [] } = useCategories();
  const deleteTx = useDeleteTransaction();
  const fmtAmount = useFormattedAmount();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "investment">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionRecord | null>(null);

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const catName = (categoryMap[t.category_id] ?? "").toLowerCase();
        const desc = (t.description ?? "").toLowerCase();
        if (!desc.includes(q) && !catName.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, search, categoryMap]);

  function handleEdit(tx: TransactionRecord) {
    setEditingTx(tx);
    setDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (!deletingTx) return;
    deleteTx.mutate(String(deletingTx.id), {
      onSuccess: () => {
        toast.success("Transacción eliminada");
        setDeletingTx(null);
      },
      onError: () => toast.error("Error al eliminar la transacción"),
    });
  }

  function handleDialogClose(v: boolean) {
    setDialogOpen(v);
    if (!v) setEditingTx(null);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Todos los movimientos</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Transacciones</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar transacciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary lg:w-80"
            />
          </div>
          <div className="flex rounded-xl bg-surface p-1">
            {(["all", "expense", "income", "investment"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  typeFilter === f
                    ? f === "expense"
                      ? "bg-destructive/15 text-destructive"
                      : f === "income"
                        ? "bg-success/15 text-success"
                        : f === "investment"
                          ? "bg-primary/15 text-primary"
                          : "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all"
                  ? "Todos"
                  : f === "expense"
                    ? "Gastos"
                    : f === "income"
                      ? "Ingresos"
                      : "Inversiones"}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setEditingTx(null);
              setDialogOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </button>
        </div>
      </div>

      <Card className="p-0">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-32 items-center justify-center text-destructive text-sm">
            Error al cargar transacciones.
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground text-sm">
            <Tag className="mb-2 h-6 w-6 opacity-50" />
            {transactions.length === 0
              ? "No se encontraron transacciones."
              : "No hay transacciones que coincidan con la búsqueda."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => {
              const categoryName = categoryMap[t.category_id] ?? "General";
              const Icon = getCategoryIcon(categoryName);
              return (
                <li
                  key={t.id}
                  className="group flex items-center gap-4 px-5 py-4 transition hover:bg-surface/60"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      t.type === "income"
                        ? "bg-success/10 text-success"
                        : t.type === "investment"
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-2 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.description ?? "Sin descripcion"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {categoryName} · {new Date(t.created_at).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <Badge tone="muted">{categoryName}</Badge>
                  {t.is_fixed && (
                    <Badge tone="primary">
                      Fija
                      {t.frequency === "monthly"
                        ? " · Mensual"
                        : t.frequency === "biweekly"
                          ? " · Quincenal"
                          : ""}
                      {t.due_day ? ` · Día ${t.due_day}` : ""}
                    </Badge>
                  )}
                  <span
                    className={cn(
                      "w-28 text-right font-display text-base font-semibold tabular-nums",
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
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => handleEdit(t)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingTx(t)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        transaction={editingTx}
      />

      <ConfirmDialog
        open={!!deletingTx}
        onOpenChange={(v) => {
          if (!v) setDeletingTx(null);
        }}
        title="Eliminar transacción"
        description={`¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        loading={deleteTx.isPending}
      />
    </div>
  );
}
