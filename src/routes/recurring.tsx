import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2, Pencil, Plus, Repeat } from "lucide-react";
import { toast } from "sonner";
import { requireAuth } from "@/lib/auth/guards";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FREQUENCY_LABELS,
  KIND_LABELS,
  RecurringDialog,
  invalidateRecurring,
  kindOf,
} from "@/components/views/RecurringDialog";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { errorText, t } from "@/lib/i18n/errors";
import { recurringApi, type RecurringStatus, type RecurringTransaction } from "@/lib/api/finance";

export const Route = createFileRoute("/recurring")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Recurrentes — Sprig" }] }),
  component: () => (
    <AppShell>
      <RecurringPage />
    </AppShell>
  ),
});

const STATUS: Record<RecurringStatus, { label: string; tone: "success" | "muted" | "primary" }> = {
  active: { label: "Activo", tone: "success" },
  cancelled: { label: "Cancelado", tone: "muted" },
  finished: { label: "Finalizado", tone: "primary" },
};

const fmtDate = (s: string) =>
  new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function RecurringPage() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const fmtAmount = useFormattedAmount();
  const [status, setStatus] = useState<RecurringStatus | "all">("active");
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState<RecurringTransaction | null>(null);

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["recurring", userId ?? "", status],
    queryFn: () => recurringApi.list(userId!, status === "all" ? undefined : status),
    enabled: !!userId,
  });

  const cancel = useMutation({
    mutationFn: (id: number) => recurringApi.cancel(userId!, id),
    onSuccess: () => {
      invalidateRecurring(qc, userId);
      toast.success("Recurrente cancelado");
      setCancelling(null);
    },
    onError: (err) => toast.error(errorText(err, "http.unknown")),
  });

  function openDialog(r: RecurringTransaction | null) {
    setEditing(r);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Recurrentes</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Lo que se repite, sin digitarlo
          </h1>
        </div>
        <button
          onClick={() => openDialog(null)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo recurrente
        </button>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as RecurringStatus | "all")}>
        <TabsList>
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="finished">Finalizados</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="flex h-32 flex-col items-center justify-center gap-3 text-sm text-destructive"
        >
          {errorText(error, "http.unknown")}
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t("ui.retry")}
          </Button>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="flex h-32 flex-col items-center justify-center text-sm text-muted-foreground">
          <Repeat className="mb-2 h-6 w-6 opacity-50" />
          No hay recurrentes en esta vista.
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((r) => (
            <Card key={r.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-semibold">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {KIND_LABELS[kindOf(r)]} · {FREQUENCY_LABELS[r.frequency]} ·{" "}
                    {r.mode === "auto" ? "Automático" : "Por confirmar"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                  {r.status === "active" && (
                    <>
                      <button
                        onClick={() => openDialog(r)}
                        aria-label={`${t("ui.edit")}: ${r.name}`}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setCancelling(r)}
                        aria-label={`Cancelar: ${r.name}`}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display text-xl font-semibold tabular-nums">
                  {fmtAmount(r.amount, { currency: r.currency })}
                </span>
                {r.status === "active" && (
                  <span className="text-sm text-muted-foreground">
                    Próxima: {fmtDate(r.next_due_date)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {r.max_occurrences != null && (
                  <Badge>
                    {r.occurrences_count} de {r.max_occurrences} cuotas
                    {r.remaining_occurrences != null && ` · quedan ${r.remaining_occurrences}`}
                  </Badge>
                )}
                {r.end_date && <Badge>Hasta {fmtDate(r.end_date)}</Badge>}
                {r.pending_validation_count > 0 && (
                  <Badge tone="warning">{r.pending_validation_count} por validar</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <RecurringDialog open={dialogOpen} onOpenChange={setDialogOpen} recurring={editing} />

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(v) => {
          if (!v) setCancelling(null);
        }}
        title="Cancelar recurrente"
        description={`"${cancelling?.name ?? ""}" dejará de generar movimientos. Los ya registrados se conservan y los pendientes por validar siguen en Transacciones.`}
        onConfirm={() => cancelling && cancel.mutate(cancelling.id)}
        loading={cancel.isPending}
        confirmLabel="Cancelar recurrente"
      />
    </div>
  );
}
