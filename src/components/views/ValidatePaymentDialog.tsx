import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useAuth } from "@/lib/auth";
import { parseCurrency } from "@/lib/format";
import { errorText } from "@/lib/i18n/errors";
import { recurringApi, type TransactionRecord } from "@/lib/api/finance";
import { invalidateRecurring } from "./RecurringDialog";

const today = () => format(new Date(), "yyyy-MM-dd");

/** Confirma un movimiento generado por un recurrente `confirm`: el saldo se mueve al validar. */
export function ValidatePaymentDialog({
  transaction,
  onClose,
}: {
  transaction: TransactionRecord | null;
  onClose: () => void;
}) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (transaction) {
      setDate(today());
      setAmount(String(transaction.amount));
    }
  }, [transaction]);

  const amountValue = parseCurrency(amount);
  const max = today();
  const valid = !!date && date <= max && amountValue > 0;

  const validate = useMutation({
    mutationFn: () =>
      recurringApi.validate(userId!, transaction!.id, {
        transaction_date: date,
        amount: amountValue,
      }),
    onSuccess: () => {
      invalidateRecurring(qc, userId);
      toast.success("Pago validado");
      onClose();
    },
    onError: (err) => toast.error(errorText(err, "http.unknown")),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (valid) validate.mutate();
  }

  return (
    <Dialog open={!!transaction} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Validar pago</DialogTitle>
          <DialogDescription>
            {transaction?.description ?? "Movimiento recurrente"}: confirma la fecha real y el
            monto. El saldo se actualiza al validar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="validate-date">Fecha del pago</Label>
            <Input
              id="validate-date"
              type="date"
              max={max}
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="validate-amount">
              Monto
              {transaction?.currency && transaction.currency !== "COP"
                ? ` (${transaction.currency})`
                : ""}
            </Label>
            <CurrencyInput
              id="validate-amount"
              value={amount}
              onChange={setAmount}
              placeholder="0"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={validate.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!valid || validate.isPending}
              className="bg-gradient-primary text-primary-foreground hover:brightness-105"
            >
              {validate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Validar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
