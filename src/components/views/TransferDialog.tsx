import { useState, useEffect } from "react";
import { Loader2, ArrowRight, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { parseCurrency } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateTransfer,
  useUpdateTransfer,
  useBankAccounts,
  useObjectives,
} from "@/lib/hooks/use-api";
import type { TransferResponse } from "@/lib/api/finance";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer?: TransferResponse | null;
}

export function TransferDialog({ open, onOpenChange, transfer }: TransferDialogProps) {
  const { data: bankAccounts = [], isLoading: loadingAccounts } = useBankAccounts();
  const { data: objectives = [], isLoading: loadingObjectives } = useObjectives();
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();

  const isEditing = !!transfer;

  const [sourceAccountId, setSourceAccountId] = useState<string>("");
  const [destinationAccountId, setDestinationAccountId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [objectiveId, setObjectiveId] = useState<string>("");

  const isPending = createTransfer.isPending || updateTransfer.isPending;

  useEffect(() => {
    if (!open) {
      setSourceAccountId("");
      setDestinationAccountId("");
      setAmount("");
      setDescription("");
      setDate(new Date());
      setObjectiveId("");
      return;
    }
    if (transfer) {
      setSourceAccountId(transfer.source.account_id ? String(transfer.source.account_id) : "");
      setDestinationAccountId(
        transfer.destination.account_id ? String(transfer.destination.account_id) : "",
      );
      setAmount(String(transfer.amount));
      setDescription(transfer.description ?? "");
      setDate(new Date(transfer.transaction_date.slice(0, 10) + "T00:00:00"));
      setObjectiveId(transfer.objective_id ? String(transfer.objective_id) : "");
    }
  }, [open, transfer]);

  const sourceAccount = bankAccounts.find((a) => String(a.id) === sourceAccountId);
  const destAccount = bankAccounts.find((a) => String(a.id) === destinationAccountId);
  const linkableObjectives = objectives.filter((o) => o.type !== "loan");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceAccountId || !destinationAccountId || !amount) return;
    if (sourceAccountId === destinationAccountId) {
      toast.error("La cuenta de origen y destino deben ser diferentes");
      return;
    }

    const dto = {
      amount: parseCurrency(amount),
      transaction_date: format(date, "yyyy-MM-dd"),
      description: description || undefined,
      objective_id: objectiveId ? Number(objectiveId) : undefined,
    };

    if (isEditing && transfer) {
      await updateTransfer.mutateAsync(
        { id: String(transfer.source.id), dto },
        {
          onSuccess: () => {
            toast.success("Transferencia actualizada");
            onOpenChange(false);
          },
          onError: (err) => {
            toast.error(
              err instanceof Error ? err.message : "Error al actualizar la transferencia",
            );
          },
        },
      );
      return;
    }

    await createTransfer.mutateAsync(
      {
        ...dto,
        source_account_id: Number(sourceAccountId),
        destination_account_id: Number(destinationAccountId),
      },
      {
        onSuccess: () => {
          toast.success("Transferencia registrada");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Error al registrar la transferencia");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transferencia" : "Nueva Transferencia"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza el movimiento de dinero entre cuentas. Los cambios aplican a ambos movimientos."
              : "Registra el movimiento de dinero de una cuenta a otra."}
          </DialogDescription>
        </DialogHeader>

        {loadingAccounts ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bankAccounts.length < 2 ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-surface p-4 text-center text-sm text-muted-foreground">
              Necesitas al menos 2 cuentas bancarias para registrar una transferencia.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── Fila 1: Cuentas ── */}
            <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cuentas
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div className="space-y-1.5">
                  <Label>Origen</Label>
                  <Select
                    value={sourceAccountId}
                    onValueChange={setSourceAccountId}
                    disabled={isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.bank_name} · {a.masked_account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sourceAccount && (
                    <p className="text-xs text-muted-foreground">
                      Saldo: ${Number(sourceAccount.display_balance).toLocaleString("es-CO")}
                    </p>
                  )}
                </div>

                <div className="flex h-10 items-center justify-center pb-0.5">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="space-y-1.5">
                  <Label>Destino</Label>
                  <Select
                    value={destinationAccountId}
                    onValueChange={setDestinationAccountId}
                    disabled={isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts
                        .filter((a) => String(a.id) !== sourceAccountId)
                        .map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.bank_name} · {a.masked_account_number}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {destAccount && (
                    <p className="text-xs text-muted-foreground">
                      Saldo: ${Number(destAccount.display_balance).toLocaleString("es-CO")}
                    </p>
                  )}
                </div>
              </div>
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  Las cuentas de la transferencia no se pueden cambiar al editar.
                </p>
              )}
            </div>

            {/* ── Fila 2: Detalles ── */}
            <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Detalles
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Monto</Label>
                  <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
                </div>

                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <DatePicker
                    value={date}
                    onChange={(d) => d && setDate(d)}
                    disabled={isPending}
                    placeholder="Seleccionar"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Descripción (opcional)</Label>
                  <Input
                    placeholder="Ej. Transferencia Bancolombia a Nu"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Meta vinculada (opcional)</Label>
                  <Select value={objectiveId} onValueChange={setObjectiveId}>
                    <SelectTrigger disabled={loadingObjectives || linkableObjectives.length === 0}>
                      <SelectValue
                        placeholder={
                          loadingObjectives
                            ? "Cargando metas..."
                            : linkableObjectives.length === 0
                              ? "No hay metas de ahorro disponibles"
                              : "Seleccionar meta..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {linkableObjectives.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          <span className="inline-flex items-center gap-2">
                            <Target className="h-3.5 w-3.5 text-muted-foreground" />
                            {o.name}
                            {o.is_completed && " · Completada"}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    El monto transferido se abona al saldo de la meta.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  !sourceAccountId ||
                  !destinationAccountId ||
                  !amount ||
                  parseCurrency(amount) <= 0 ||
                  sourceAccountId === destinationAccountId ||
                  isPending
                }
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Guardar cambios" : "Registrar transferencia"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
