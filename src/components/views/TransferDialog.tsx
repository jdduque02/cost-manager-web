import { useState, useEffect } from "react";
import { Loader2, ArrowRight } from "lucide-react";
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
import { useCreateTransfer, useBankAccounts } from "@/lib/hooks/use-api";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferDialog({ open, onOpenChange }: TransferDialogProps) {
  const { data: bankAccounts = [], isLoading: loadingAccounts } = useBankAccounts();
  const createTransfer = useCreateTransfer();

  const [sourceAccountId, setSourceAccountId] = useState<string>("");
  const [destinationAccountId, setDestinationAccountId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const isPending = createTransfer.isPending;

  useEffect(() => {
    if (!open) {
      setSourceAccountId("");
      setDestinationAccountId("");
      setAmount("");
      setDescription("");
      setDate(new Date());
    }
  }, [open]);

  const sourceAccount = bankAccounts.find((a) => String(a.id) === sourceAccountId);
  const destAccount = bankAccounts.find((a) => String(a.id) === destinationAccountId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceAccountId || !destinationAccountId || !amount) return;
    if (sourceAccountId === destinationAccountId) {
      toast.error("La cuenta de origen y destino deben ser diferentes");
      return;
    }

    await createTransfer.mutateAsync(
      {
        source_account_id: Number(sourceAccountId),
        destination_account_id: Number(destinationAccountId),
        amount: parseCurrency(amount),
        transaction_date: format(date, "yyyy-MM-dd"),
        description: description || undefined,
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
          <DialogTitle>Nueva Transferencia</DialogTitle>
          <DialogDescription>
            Registra el movimiento de dinero de una cuenta a otra.
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
                  <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
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
                  <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
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
                Registrar transferencia
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
