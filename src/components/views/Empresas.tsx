import { useState, useMemo } from "react";
import { Loader2, Plus, Building2, Trash2, Pencil } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { useEmpresas, useDeleteEmpresa, useCategories, useTransactions } from "@/lib/hooks/use-api";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmpresaDialog } from "./EmpresaDialog";
import { TransactionsDetailModal } from "./TransactionsDetailModal";
import { toast } from "sonner";
import type { Empresa } from "@/lib/api/empresas";

export function Empresas() {
  const { data: empresas = [], isLoading } = useEmpresas();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions({ limit: 5000 });
  const deleteEmpresa = useDeleteEmpresa();
  const fmtAmount = useFormattedAmount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);
  const [detailEmpresa, setDetailEmpresa] = useState<Empresa | null>(null);

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  const categoryMapForModal = useMemo(() => {
    const m = new Map<number, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const empresaTransactionCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    transactions.forEach((t) => {
      if (t.company_id) {
        counts[t.company_id] = (counts[t.company_id] ?? 0) + 1;
      }
    });
    return counts;
  }, [transactions]);

  const totalExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const empresaExpenses = useMemo(() => {
    const expenses: Record<number, number> = {};
    transactions.forEach((t) => {
      if (t.company_id && t.type === "expense") {
        expenses[t.company_id] = (expenses[t.company_id] ?? 0) + t.amount;
      }
    });
    return expenses;
  }, [transactions]);

  const empresaDetailTransactions = useMemo(() => {
    if (!detailEmpresa) return [];
    return transactions.filter((t) => t.company_id === detailEmpresa.id);
  }, [transactions, detailEmpresa]);

  function handleEdit(e: Empresa) {
    setEditingEmpresa(e);
    setDialogOpen(true);
  }

  function handleNew() {
    setEditingEmpresa(null);
    setDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = toast.loading("Eliminando empresa...");
    deleteEmpresa
      .mutateAsync(deleteTarget.id)
      .then(() => {
        toast.success("Empresa eliminada", { id });
        setDeleteTarget(null);
      })
      .catch(() => {
        toast.error("Error al eliminar la empresa", { id });
      });
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Organización</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Empresas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Administra tus empresas y visualiza las transacciones asociadas.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva Empresa
        </button>
      </div>

      {isLoading && (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {!isLoading && empresas.length === 0 && (
        <Card className="flex h-40 flex-col items-center justify-center text-muted-foreground text-sm">
          <Building2 className="mb-2 h-6 w-6 opacity-50" />
          No hay empresas creadas.
        </Card>
      )}
      {!isLoading && empresas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {empresas.map((e) => {
            const count = empresaTransactionCounts[e.id] ?? 0;
            const expenses = empresaExpenses[e.id] ?? 0;
            const pct = totalExpenses > 0 ? (expenses / totalExpenses) * 100 : 0;
            const catName = e.default_category_id ? categoryMap[e.default_category_id] : null;

            return (
              <Card
                key={e.id}
                className="cursor-pointer transition hover:shadow-elegant"
                onClick={() => setDetailEmpresa(e)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold">{e.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} transacción{count !== 1 ? "es" : ""}
                    </p>
                  </div>
                  {catName && <Badge tone="primary">{catName}</Badge>}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Gastos: {fmtAmount(expenses)}</span>
                  <span>{pct.toFixed(1)}% del total</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleEdit(e);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setDeleteTarget(e);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <EmpresaDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingEmpresa(null);
        }}
        empresa={editingEmpresa}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        title="Eliminar empresa"
        description={`¿Estás seguro de eliminar "${deleteTarget?.name ?? ""}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        loading={deleteEmpresa.isPending}
      />

      {detailEmpresa && (
        <TransactionsDetailModal
          open={!!detailEmpresa}
          onOpenChange={(v) => {
            if (!v) setDetailEmpresa(null);
          }}
          title={`Transacciones de ${detailEmpresa.name}`}
          subtitle={`Gastos: ${fmtAmount(empresaExpenses[detailEmpresa.id] ?? 0)} · ${(((empresaExpenses[detailEmpresa.id] ?? 0) / (totalExpenses || 1)) * 100).toFixed(1)}% del total`}
          transactions={empresaDetailTransactions}
          categoryMap={categoryMapForModal}
        />
      )}
    </div>
  );
}
