import { useState, useEffect } from "react";
import { Loader2, FolderOpen } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
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
import { parseCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateTransaction,
  useUpdateTransaction,
  useCategories,
  useSubcategories,
} from "@/lib/hooks/use-api";
import type { TransactionType, PaymentMethod, TransactionRecord } from "@/lib/api/finance";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: TransactionRecord | null;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "debit_card", label: "Tarjeta débito" },
  { value: "credit_card", label: "Tarjeta crédito" },
  { value: "digital_wallet", label: "Billetera digital" },
  { value: "mobile_payment", label: "Pago móvil" },
];

export function TransactionDialog({ open, onOpenChange, transaction }: TransactionDialogProps) {
  const { data: categories = [] } = useCategories();
  const { data: subcategories = [], isLoading: loadingSubs } = useSubcategories();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const navigate = useNavigate();

  const isEditing = !!transaction;

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  const hasSubcategories = subcategories.length > 0;
  const isPending = createTx.isPending || updateTx.isPending;

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCategoryId(String(transaction.category_id));
      setDescription(transaction.description ?? "");
      setPaymentMethod(transaction.payment_method ?? "");
    } else {
      reset();
    }
  }, [transaction, open]);

  function reset() {
    setType("expense");
    setAmount("");
    setCategoryId("");
    setDescription("");
    setPaymentMethod("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !amount || parseCurrency(amount) <= 0) return;

    const payload = {
      type,
      amount: parseCurrency(amount),
      category_id: Number(categoryId),
      description: description || undefined,
      payment_method: (paymentMethod as PaymentMethod) || undefined,
    };

    if (isEditing) {
      await updateTx.mutateAsync(
        { id: String(transaction.id), dto: payload },
        {
          onSuccess: () => {
            toast.success("Transacción actualizada");
            reset();
            onOpenChange(false);
          },
          onError: () => toast.error("Error al actualizar la transacción"),
        },
      );
    } else {
      await createTx.mutateAsync(payload, {
        onSuccess: () => {
          toast.success("Transacción creada");
          reset();
          onOpenChange(false);
        },
        onError: () => toast.error("Error al crear la transacción"),
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transacción" : "Nueva Transacción"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos de la transacción." : "Registra un ingreso o gasto."}
          </DialogDescription>
        </DialogHeader>

        {loadingSubs ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasSubcategories ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-xl bg-surface p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Sin subcategorías configuradas
                </p>
                <p className="text-xs text-muted-foreground">
                  Debes crear subcategorías antes de registrar transacciones.
                </p>
              </div>
            </div>
            <Badge tone="primary">Configura tus categorías primero</Badge>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate({ to: "/categories" });
                }}
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                Ir a Categorías
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-1">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg py-2 text-sm font-medium transition ${
                    type === t
                      ? t === "expense"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-success/15 text-success"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "expense" ? "Gasto" : "Ingreso"}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Monto</Label>
              <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                placeholder="Ej. Almuerzo"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={!categoryId || !amount || parseCurrency(amount) <= 0 || isPending}
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
