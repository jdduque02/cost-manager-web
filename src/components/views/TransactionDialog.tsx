import { useState, useEffect } from "react";
import { Loader2, FolderOpen } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { parseCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateTransaction,
  useUpdateTransaction,
  useCategories,
  useSubcategories,
  useObjectives,
  useBankAccounts,
  useFinancialAssets,
  useFinancialLiabilities,
} from "@/lib/hooks/use-api";
import type {
  TransactionType,
  PaymentMethod,
  TransactionRecord,
  FixedType,
  FixedFrequency,
} from "@/lib/api/finance";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: TransactionRecord | null;
  defaultDate?: Date | null;
}

function toLocalDate(iso?: string | null): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "debit_card", label: "Tarjeta débito" },
  { value: "credit_card", label: "Tarjeta crédito" },
  { value: "digital_wallet", label: "Billetera digital" },
  { value: "mobile_payment", label: "Pago móvil" },
];

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  defaultDate,
}: TransactionDialogProps) {
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: objectives = [] } = useObjectives();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: assets = [] } = useFinancialAssets();
  const { data: liabilities = [] } = useFinancialLiabilities();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const navigate = useNavigate();

  const isEditing = !!transaction;

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [isFixed, setIsFixed] = useState(false);
  const [fixedType, setFixedType] = useState<FixedType>("deduction");
  const [frequency, setFrequency] = useState<FixedFrequency | "">("");
  const [dueDay, setDueDay] = useState("");
  const [reminderDays, setReminderDays] = useState("3");
  const [sourceBank, setSourceBank] = useState("");
  const [sourceAccount, setSourceAccount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [objectiveId, setObjectiveId] = useState<string>("");
  const [patrimony, setPatrimony] = useState<string>("");

  const selectedCategoryId = categoryId ? Number(categoryId) : undefined;
  const { data: subcategories = [] } = useSubcategories(selectedCategoryId);

  const hasCategories = categories.length > 0;
  const isPending = createTx.isPending || updateTx.isPending;

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(Number(transaction.amount).toString());
      setCategoryId(String(transaction.category_id));
      setSubcategoryId(transaction.subcategory_id ? String(transaction.subcategory_id) : "");
      setDescription(transaction.description ?? "");
      setPaymentMethod(transaction.payment_method ?? "");
      setIsFixed(transaction.is_fixed ?? false);
      setFixedType(
        transaction.fixed_type ?? (transaction.type === "income" ? "fixed_income" : "deduction"),
      );
      setFrequency(transaction.frequency ?? "");
      setDueDay(transaction.due_day ? String(transaction.due_day) : "");
      setReminderDays(transaction.reminder_days != null ? String(transaction.reminder_days) : "3");
      setSourceBank(transaction.source_bank ?? "");
      setSourceAccount(transaction.source_account ?? "");
      setDate(toLocalDate(transaction.transaction_date) ?? new Date());
      setObjectiveId(transaction.objective_id ? String(transaction.objective_id) : "");
      setPatrimony(
        transaction.account_id
          ? `account:${transaction.account_id}`
          : transaction.asset_id
            ? `asset:${transaction.asset_id}`
            : transaction.liability_id
              ? `liability:${transaction.liability_id}`
              : "",
      );
    } else {
      reset();
    }
  }, [transaction, open]);

  function reset() {
    setType("expense");
    setAmount("");
    setCategoryId("");
    setSubcategoryId("");
    setDescription("");
    setPaymentMethod("");
    setIsFixed(false);
    setFixedType("deduction");
    setFrequency("");
    setDueDay("");
    setReminderDays("3");
    setSourceBank("");
    setSourceAccount("");
    setDate(defaultDate ? new Date(defaultDate) : new Date());
    setObjectiveId("");
    setPatrimony("");
  }

  function parsePatrimony(value: string) {
    if (!value) return {};
    const [kind, id] = value.split(":");
    const numId = Number(id);
    if (!kind || !numId) return {};
    if (kind === "account") return { account_id: numId };
    if (kind === "asset") return { asset_id: numId };
    if (kind === "liability") return { liability_id: numId };
    return {};
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !amount || parseCurrency(amount) <= 0) return;

    const p = parsePatrimony(patrimony);
    const payload = {
      type,
      amount: parseCurrency(amount),
      category_id: Number(categoryId),
      subcategory_id: subcategoryId ? Number(subcategoryId) : undefined,
      description: description || undefined,
      payment_method: (paymentMethod as PaymentMethod) || undefined,
      transaction_date: format(date, "yyyy-MM-dd"),
      is_fixed: isFixed,
      fixed_type: isFixed
        ? (fixedType ?? (type === "income" ? "fixed_income" : "deduction"))
        : undefined,
      frequency: isFixed ? frequency || undefined : undefined,
      due_day: isFixed && dueDay ? Number(dueDay) : undefined,
      reminder_days: isFixed && reminderDays ? Number(reminderDays) : undefined,
      source_bank: isFixed && type !== "income" && sourceBank ? sourceBank : undefined,
      source_account: isFixed && type !== "income" && sourceAccount ? sourceAccount : undefined,
      objective_id: objectiveId ? Number(objectiveId) : undefined,
      account_id: p.account_id ?? undefined,
      asset_id: p.asset_id ?? undefined,
      liability_id: p.liability_id ?? undefined,
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transacción" : "Nueva Transacción"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos de la transacción." : "Registra un ingreso o gasto."}
          </DialogDescription>
        </DialogHeader>

        {loadingCategories ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasCategories ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-xl bg-surface p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Sin categorías configuradas</p>
                <p className="text-xs text-muted-foreground">
                  Debes crear categorías antes de registrar transacciones.
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
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface p-1">
              {(["expense", "income", "investment"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg py-2 text-sm font-medium transition ${
                    type === t
                      ? t === "expense"
                        ? "bg-destructive/15 text-destructive"
                        : t === "income"
                          ? "bg-success/15 text-success"
                          : "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "expense" ? "Gasto" : t === "income" ? "Ingreso" : "Inversión"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Monto</Label>
                <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
              </div>

              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => {
                    setCategoryId(v);
                    setSubcategoryId("");
                  }}
                >
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

              {subcategories.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Subcategoría</Label>
                  <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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

              <div className="space-y-1.5">
                <Label>Fecha de la transacción</Label>
                <DatePicker value={date} onChange={(d) => d && setDate(d)} disabled={isPending} />
              </div>

              <div className="space-y-1.5">
                <Label>Meta asociada</Label>
                <Select value={objectiveId} onValueChange={setObjectiveId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {objectives.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Patrimonio asociado</Label>
                <Select value={patrimony} onValueChange={setPatrimony}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Cuentas</SelectLabel>
                      {bankAccounts.map((a) => (
                        <SelectItem key={a.id} value={`account:${a.id}`}>
                          {a.bank_name} · {a.masked_account_number}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Activos</SelectLabel>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={`asset:${a.id}`}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Pasivos</SelectLabel>
                      {liabilities.map((l) => (
                        <SelectItem key={l.id} value={`liability:${l.id}`}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Transacción fija</p>
                  <p className="text-xs text-muted-foreground">
                    Deducción fija o ingreso fijo con periodicidad.
                  </p>
                </div>
                <Checkbox
                  checked={isFixed}
                  onCheckedChange={(v) => setIsFixed(v === true)}
                  aria-label="Marcar como transacción fija"
                />
              </div>
            </div>

            {isFixed && (
              <div className="grid grid-cols-1 gap-4 rounded-xl bg-surface p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tipo fijo</Label>
                  <Select value={fixedType} onValueChange={(v) => setFixedType(v as FixedType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deduction">Deducción fija</SelectItem>
                      <SelectItem value="fixed_income">Ingreso fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Periodicidad</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as FixedFrequency)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="biweekly">Quincenal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Día de vencimiento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Ej. 15"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Anticipación (días)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    placeholder="Ej. 3"
                    value={reminderDays}
                    onChange={(e) =>
                      setReminderDays(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
                    }
                  />
                </div>
              </div>
            )}

            {isFixed && type !== "income" && (
              <div className="space-y-2 rounded-xl bg-surface p-3">
                <p className="text-xs font-medium text-muted-foreground">Entidad de origen</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Banco / entidad</Label>
                    <Input
                      placeholder="Ej. Banco Lulo"
                      value={sourceBank}
                      onChange={(e) => setSourceBank(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cuenta / referencia</Label>
                    <Input
                      placeholder="Ej. Cuenta de ahorros 1234"
                      value={sourceAccount}
                      onChange={(e) => setSourceAccount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

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
