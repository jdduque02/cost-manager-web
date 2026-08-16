import { useState, useEffect, useMemo } from "react";
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
import { Combobox, type ComboboxGroup } from "@/components/ui/combobox";
import { InlineCategoryCreator } from "@/components/ui/inline-category-creator";
import { InlineSubcategoryCreator } from "@/components/ui/inline-subcategory-creator";
import {
  useCreateTransaction,
  useUpdateTransaction,
  useCategories,
  useSubcategories,
  useObjectives,
  useBankAccounts,
  useFinancialAssets,
  useFinancialLiabilities,
  useEmpresas,
} from "@/lib/hooks/use-api";
import { GoalDialog } from "./GoalDialog";
import { WealthDialog } from "./WealthDialog";
import { TransferDialog } from "./TransferDialog";
import { EmpresaDialog } from "./EmpresaDialog";
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
  const { data: empresas = [] } = useEmpresas();
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
  const [installments, setInstallments] = useState("");
  const [installmentValue, setInstallmentValue] = useState("");
  const [applyToSimilar, setApplyToSimilar] = useState(false);
  const [sourceBank, setSourceBank] = useState("");
  const [sourceAccount, setSourceAccount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [objectiveId, setObjectiveId] = useState<string>("");
  const [patrimony, setPatrimony] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [quickMetaOpen, setQuickMetaOpen] = useState(false);
  const [quickEmpresaOpen, setQuickEmpresaOpen] = useState(false);
  const [quickWealthType, setQuickWealthType] = useState<"account" | "asset" | "liability" | null>(
    null,
  );
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const selectedCategoryId = categoryId ? Number(categoryId) : undefined;
  const { data: subcategories = [] } = useSubcategories(selectedCategoryId);

  const categoryGroups = useMemo<ComboboxGroup[]>(() => {
    const groups: Record<string, { heading: string; items: { value: string; label: string }[] }> = {
      expense: { heading: "Gastos", items: [] },
      income: { heading: "Ingresos", items: [] },
      investment: { heading: "Inversiones", items: [] },
    };
    for (const c of categories) {
      const key = c.group_type ?? "expense";
      if (groups[key]) {
        groups[key].items.push({ value: String(c.id), label: c.name });
      }
    }
    return Object.values(groups).filter((g) => g.items.length > 0);
  }, [categories]);

  const subcategoryItems = useMemo(
    () => subcategories.map((s) => ({ value: String(s.id), label: s.name })),
    [subcategories],
  );

  const hasCategories = categories.length > 0;
  const isPending = createTx.isPending || updateTx.isPending;

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(Number(transaction.amount).toString());
      setCategoryId(transaction.category_id ? String(transaction.category_id) : "");
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
      setInstallments(transaction.installments ? String(transaction.installments) : "");
      setInstallmentValue(
        transaction.installment_value ? String(transaction.installment_value) : "",
      );
      setApplyToSimilar(false);
      setSourceBank(transaction.source_bank ?? "");
      setSourceAccount(transaction.source_account ?? "");
      setDate(toLocalDate(transaction.transaction_date) ?? new Date());
      setObjectiveId(transaction.objective_id ? String(transaction.objective_id) : "");
      setCompanyId(transaction.company_id ? String(transaction.company_id) : "");
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
    setInstallments("");
    setInstallmentValue("");
    setApplyToSimilar(false);
    setSourceBank("");
    setSourceAccount("");
    setDate(defaultDate ? new Date(defaultDate) : new Date());
    setObjectiveId("");
    setCompanyId("");
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
    if (!amount || parseCurrency(amount) <= 0) return;

    const p = parsePatrimony(patrimony);
    const payload = {
      type,
      amount: parseCurrency(amount),
      category_id: categoryId ? Number(categoryId) : undefined,
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
      installments: installments ? Number(installments) : undefined,
      installment_value: installmentValue ? parseCurrency(installmentValue) : undefined,
      source_bank: isFixed && type !== "income" && sourceBank ? sourceBank : undefined,
      source_account: isFixed && type !== "income" && sourceAccount ? sourceAccount : undefined,
      objective_id: objectiveId ? Number(objectiveId) : undefined,
      account_id: p.account_id ?? undefined,
      asset_id: p.asset_id ?? undefined,
      liability_id: p.liability_id ?? undefined,
      company_id: companyId ? Number(companyId) : undefined,
    };

    if (isEditing) {
      await updateTx.mutateAsync(
        {
          id: String(transaction.id),
          dto: { ...payload, apply_to_similar: applyToSimilar || undefined },
        },
        {
          onSuccess: () => {
            toast.success(
              applyToSimilar ? "Transacción y similares actualizadas" : "Transacción actualizada",
            );
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
    <>
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
                  className="bg-gradient-primary text-primary-foreground hover:brightness-105"
                >
                  Ir a Categorías
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* ── Fila 1: Datos principales ── */}
              <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tipo de movimiento
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["expense", "income", "investment", "transfer"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        if (t === "transfer") {
                          onOpenChange(false);
                          setTransferDialogOpen(true);
                          return;
                        }
                        setType(t);
                      }}
                      className={`rounded-lg py-2 text-sm font-medium transition ${
                        type === t && t !== "transfer"
                          ? t === "expense"
                            ? "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
                            : t === "income"
                              ? "bg-success/15 text-success ring-1 ring-success/30"
                              : "bg-primary/15 text-primary ring-1 ring-primary/30"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {t === "expense"
                        ? "Gasto"
                        : t === "income"
                          ? "Ingreso"
                          : t === "investment"
                            ? "Inversión"
                            : "Transferencia"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Monto</Label>
                    <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label>Categoría</Label>
                      <InlineCategoryCreator
                        groupType={type === "transfer" ? "expense" : type}
                        onCreated={(id) => {
                          setCategoryId(String(id));
                          setSubcategoryId("");
                        }}
                      />
                    </div>
                    <Combobox
                      value={categoryId}
                      onValueChange={(v) => {
                        setCategoryId(v);
                        setSubcategoryId("");
                      }}
                      groups={categoryGroups}
                      placeholder="Sin categoría"
                      searchPlaceholder="Buscar categoría..."
                      emptyText="Sin resultados"
                    />
                    <p className="text-xs text-muted-foreground">
                      {categoryId
                        ? "La transacción se marca como clasificada."
                        : "Sin categoría: se intenta auto-clasificar por descripción; si no hay regla, queda pendiente por editar."}
                    </p>
                  </div>

                  {categoryId && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Label>Subcategoría</Label>
                        <InlineSubcategoryCreator
                          categoryId={Number(categoryId)}
                          onCreated={(id) => setSubcategoryId(String(id))}
                        />
                      </div>
                      <Combobox
                        value={subcategoryId}
                        onValueChange={setSubcategoryId}
                        items={subcategoryItems}
                        placeholder="Opcional"
                        searchPlaceholder="Buscar subcategoría..."
                        emptyText="Sin resultados"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Fila 2: Detalles ── */}
              <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Detalles
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    <DatePicker
                      value={date}
                      onChange={(d) => d && setDate(d)}
                      disabled={isPending}
                      placeholder="Seleccionar"
                    />
                  </div>
                </div>

                {(paymentMethod === "credit_card" || installments !== "" || isEditing) && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>N.º de cuotas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        placeholder="Ej. 12"
                        value={installments}
                        onChange={(e) =>
                          setInstallments(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Valor por cuota</Label>
                      <CurrencyInput
                        value={installmentValue}
                        onChange={setInstallmentValue}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Fila 3: Asociaciones y configuración ── */}
              <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Asociaciones y configuración
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Meta asociada</Label>
                    <Select
                      value={objectiveId}
                      onValueChange={(v) => {
                        if (v === "__new_meta__") {
                          setQuickMetaOpen(true);
                          return;
                        }
                        setObjectiveId(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {objectives.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__new_meta__">＋ Crear meta…</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Empresa</Label>
                    <Select
                      value={companyId}
                      onValueChange={(v) => {
                        if (v === "__new_empresa__") {
                          setQuickEmpresaOpen(true);
                          return;
                        }
                        setCompanyId(v);
                        if (!categoryId && v) {
                          const emp = empresas.find((e) => String(e.id) === v);
                          if (emp?.default_category_id) {
                            setCategoryId(String(emp.default_category_id));
                            setSubcategoryId("");
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {empresas.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__new_empresa__">＋ Crear empresa…</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Asocia la transacción a una empresa. Selecciona una empresa para auto-asignar
                      su categoría por defecto.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Patrimonio asociado</Label>
                    <Select
                      value={patrimony}
                      onValueChange={(v) => {
                        if (
                          v === "__new_account__" ||
                          v === "__new_asset__" ||
                          v === "__new_liability__"
                        ) {
                          setQuickWealthType(
                            v === "__new_account__"
                              ? "account"
                              : v === "__new_asset__"
                                ? "asset"
                                : "liability",
                          );
                          return;
                        }
                        setPatrimony(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.filter((a) => a.account_type === "ahorros").length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Cuentas de ahorro</SelectLabel>
                            {bankAccounts
                              .filter((a) => a.account_type === "ahorros")
                              .map((a) => (
                                <SelectItem key={a.id} value={`account:${a.id}`}>
                                  {a.bank_name} · {a.masked_account_number}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        )}
                        {bankAccounts.filter((a) => a.account_type === "corriente").length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Cuentas corrientes</SelectLabel>
                            {bankAccounts
                              .filter((a) => a.account_type === "corriente")
                              .map((a) => (
                                <SelectItem key={a.id} value={`account:${a.id}`}>
                                  {a.bank_name} · {a.masked_account_number}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        )}
                        {bankAccounts.filter(
                          (a) => a.account_type !== "ahorros" && a.account_type !== "corriente",
                        ).length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Otras cuentas</SelectLabel>
                            {bankAccounts
                              .filter(
                                (a) =>
                                  a.account_type !== "ahorros" && a.account_type !== "corriente",
                              )
                              .map((a) => (
                                <SelectItem key={a.id} value={`account:${a.id}`}>
                                  {a.bank_name} · {a.masked_account_number}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        )}
                        <SelectItem value="__new_account__">＋ Crear cuenta…</SelectItem>
                        <SelectGroup>
                          <SelectLabel>Activos / Inversiones</SelectLabel>
                          {assets.map((a) => (
                            <SelectItem key={a.id} value={`asset:${a.id}`}>
                              {a.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new_asset__">＋ Crear activo…</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Pasivos / Deudas</SelectLabel>
                          {liabilities.map((l) => (
                            <SelectItem key={l.id} value={`liability:${l.id}`}>
                              {l.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new_liability__">＋ Crear pasivo…</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Máximo un patrimonio (cuenta, activo o pasivo) por transacción.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-background/50 p-2.5">
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

                {isFixed && (
                  <div className="grid grid-cols-1 gap-4 rounded-lg bg-background/50 p-2.5 sm:grid-cols-2">
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
                        onChange={(e) =>
                          setDueDay(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
                        }
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
                  <div className="space-y-2 rounded-lg bg-background/50 p-2.5">
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

                {isEditing && (
                  <div className="flex items-center justify-between rounded-lg bg-background/50 p-2.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Aplicar a transacciones similares
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Actualiza la categoría de los movimientos con la misma descripción.
                      </p>
                    </div>
                    <Checkbox
                      checked={applyToSimilar}
                      onCheckedChange={(v) => setApplyToSimilar(v === true)}
                      aria-label="Aplicar a transacciones similares"
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!amount || parseCurrency(amount) <= 0 || isPending}
                  className="bg-gradient-primary text-primary-foreground hover:brightness-105"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEditing ? "Actualizar" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <GoalDialog
        open={quickMetaOpen}
        onOpenChange={(v) => {
          if (!v) setQuickMetaOpen(false);
        }}
        onCreated={(g) => {
          setObjectiveId(String(g.id));
        }}
      />

      <WealthDialog
        open={!!quickWealthType}
        onOpenChange={(v) => {
          if (!v) setQuickWealthType(null);
        }}
        entityType={quickWealthType ?? "account"}
        onCreated={(e) => {
          if ("bank_name" in e) setPatrimony(`account:${e.id}`);
          else if ("asset_type" in e) setPatrimony(`asset:${e.id}`);
          else setPatrimony(`liability:${e.id}`);
        }}
      />

      <TransferDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} />

      <EmpresaDialog
        open={quickEmpresaOpen}
        onOpenChange={(v) => setQuickEmpresaOpen(v)}
        onCreated={(e) => {
          setCompanyId(String(e.id));
          if (!categoryId && e.default_category_id) {
            setCategoryId(String(e.default_category_id));
            setSubcategoryId("");
          }
        }}
      />
    </>
  );
}
