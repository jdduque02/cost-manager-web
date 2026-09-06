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
import { fmtCurrency, isInsufficientBalance, parseCurrency } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
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
  useEmpresas,
  useFinancialLiabilities,
} from "@/lib/hooks/use-api";
import type { TransferResponse, FixedFrequency } from "@/lib/api/finance";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer?: TransferResponse | null;
}

export function TransferDialog({ open, onOpenChange, transfer }: TransferDialogProps) {
  const { data: bankAccounts = [], isLoading: loadingAccounts } = useBankAccounts();
  const { data: objectives = [], isLoading: loadingObjectives } = useObjectives();
  const { data: empresas = [] } = useEmpresas();
  const { data: liabilities = [] } = useFinancialLiabilities();
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();

  const isEditing = !!transfer;

  const [sourceAccountId, setSourceAccountId] = useState<string>("");
  const [destinationAccountId, setDestinationAccountId] = useState<string>("");
  const [destinationLiabilityId, setDestinationLiabilityId] = useState<string>("");
  const [destinationType, setDestinationType] = useState<"account" | "liability">("account");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [objectiveId, setObjectiveId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [isPending, setIsPending] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [frequency, setFrequency] = useState<FixedFrequency | "">("");
  const [dueDay, setDueDay] = useState("");
  const [reminderDays, setReminderDays] = useState("3");

  const creditCards = liabilities.filter((l) => l.liability_type === "tarjeta_credito");

  useEffect(() => {
    if (!open) {
      setSourceAccountId("");
      setDestinationAccountId("");
      setDestinationLiabilityId("");
      setDestinationType("account");
      setAmount("");
      setDescription("");
      setDate(new Date());
      setObjectiveId("");
      setCompanyId("");
      setIsFixed(false);
      setFrequency("");
      setDueDay("");
      setReminderDays("3");
      return;
    }
    if (transfer) {
      setSourceAccountId(transfer.source.account_id ? String(transfer.source.account_id) : "");
      if (transfer.destination.liability_id) {
        setDestinationType("liability");
        setDestinationLiabilityId(String(transfer.destination.liability_id));
        setDestinationAccountId("");
      } else {
        setDestinationAccountId(
          transfer.destination.account_id ? String(transfer.destination.account_id) : "",
        );
        setDestinationLiabilityId("");
      }
      setAmount(String(transfer.amount));
      setDescription(transfer.description ?? "");
      setDate(new Date(transfer.transaction_date.slice(0, 10) + "T00:00:00"));
      setObjectiveId(transfer.objective_id ? String(transfer.objective_id) : "");
      setCompanyId(transfer.source.company_id ? String(transfer.source.company_id) : "");
      setIsFixed(transfer.is_fixed ?? false);
      setFrequency(transfer.frequency ?? "");
      setDueDay(String(transfer.due_day ?? ""));
      setReminderDays(String(transfer.reminder_days ?? "3"));
    }
  }, [open, transfer]);

  const sourceAccount = bankAccounts.find((a) => String(a.id) === sourceAccountId);
  const destAccount = bankAccounts.find((a) => String(a.id) === destinationAccountId);
  const linkableObjectives = objectives.filter((o) => o.type !== "loan");
  const availableDestinationAccounts = bankAccounts.filter((a) => String(a.id) !== sourceAccountId);

  let objectivePlaceholder: string;
  if (loadingObjectives) {
    objectivePlaceholder = "Cargando metas...";
  } else if (linkableObjectives.length === 0) {
    objectivePlaceholder = "No hay metas de ahorro disponibles";
  } else {
    objectivePlaceholder = "Seleccionar meta...";
  }

  const isPendingSubmit = createTransfer.isPending || updateTransfer.isPending;

  const sourceBalance = sourceAccount ? Number(sourceAccount.display_balance) : 0;
  const transferAmount = amount ? parseCurrency(amount) : 0;
  const insufficientBalance = isInsufficientBalance(transferAmount, sourceBalance);

  function buildDto() {
    const fixedOpt = <T,>(val: T | undefined | ""): T | undefined =>
      isFixed && val !== "" && val !== undefined ? val : undefined;

    return {
      amount: parseCurrency(amount),
      transaction_date: format(date, "yyyy-MM-dd"),
      description: description || undefined,
      objective_id: objectiveId ? Number(objectiveId) : undefined,
      company_id: companyId ? Number(companyId) : undefined,
      is_fixed: isFixed || undefined,
      fixed_type: isFixed ? ("deduction" as const) : undefined,
      frequency: fixedOpt(frequency as FixedFrequency),
      due_day: fixedOpt(dueDay ? Number(dueDay) : undefined),
      reminder_days: fixedOpt(reminderDays ? Number(reminderDays) : undefined),
      ...(destinationType === "account"
        ? { destination_account_id: Number(destinationAccountId) }
        : { destination_liability_id: Number(destinationLiabilityId) }),
    };
  }

  function validateTransfer(): boolean {
    if (!sourceAccountId || !amount) return false;
    if (destinationType === "account" && !destinationAccountId) return false;
    if (destinationType === "liability" && !destinationLiabilityId) return false;
    if (destinationType === "account" && sourceAccountId === destinationAccountId) {
      toast.error("La cuenta de origen y destino deben ser diferentes");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateTransfer()) return;

    const dto = buildDto();

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

  function renderLoadingBody() {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function renderInsufficientAccountsBody() {
    return (
      <div className="space-y-4 py-2">
        <div className="rounded-xl bg-surface p-4 text-center text-sm text-muted-foreground">
          Necesitas al menos una cuenta bancaria para registrar una transferencia.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </div>
    );
  }

  const isSubmitDisabled =
    !sourceAccountId ||
    !amount ||
    parseCurrency(amount) <= 0 ||
    insufficientBalance ||
    (destinationType === "account" &&
      (!destinationAccountId || sourceAccountId === destinationAccountId)) ||
    (destinationType === "liability" && !destinationLiabilityId) ||
    isPendingSubmit;

  function renderFormBody() {
    return (
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
                  Saldo: {fmtCurrency(Number(sourceAccount.display_balance))}
                </p>
              )}
              {insufficientBalance && (
                <p className="text-xs font-medium text-destructive">
                  Saldo insuficiente (disponible {fmtCurrency(sourceBalance)})
                </p>
              )}
            </div>

            <div className="flex h-10 items-center justify-center pb-0.5">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="space-y-1.5">
              <Label>Destino</Label>
              {!isEditing && creditCards.length > 0 && (
                <div className="flex rounded-lg bg-surface p-0.5 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationType("account");
                      setDestinationLiabilityId("");
                    }}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      destinationType === "account"
                        ? "bg-surface-2 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Cuenta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationType("liability");
                      setDestinationAccountId("");
                    }}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      destinationType === "liability"
                        ? "bg-surface-2 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tarjeta de crédito
                  </button>
                </div>
              )}
              {destinationType === "account" ? (
                <>
                  <Select
                    value={destinationAccountId}
                    onValueChange={setDestinationAccountId}
                    disabled={isEditing || availableDestinationAccounts.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          availableDestinationAccounts.length === 0
                            ? "Sin cuentas disponibles"
                            : "Seleccionar..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDestinationAccounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.bank_name} · {a.masked_account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isEditing && availableDestinationAccounts.length === 0 && (
                    <p className="text-xs font-medium text-warning">
                      {creditCards.length > 0
                        ? 'No hay otra cuenta bancaria disponible. Usa "Tarjeta de crédito" como destino.'
                        : "No hay ninguna otra cuenta o tarjeta de crédito disponible como destino."}
                    </p>
                  )}
                </>
              ) : (
                <Select
                  value={destinationLiabilityId}
                  onValueChange={setDestinationLiabilityId}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tarjeta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {l.name} ({l.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {destAccount && (
                <p className="text-xs text-muted-foreground">
                  Saldo: {fmtCurrency(Number(destAccount.display_balance))}
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
                  <SelectValue placeholder={objectivePlaceholder} />
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

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Empresa destino (opcional)</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger disabled={empresas.length === 0}>
                  <SelectValue
                    placeholder={
                      empresas.length === 0
                        ? "No hay empresas disponibles"
                        : "Seleccionar empresa..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Fila 3: Transferencia fija ── */}
        <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-3">
          <div className="flex items-center justify-between rounded-lg bg-background/50 p-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Transferencia fija</p>
              <p className="text-xs text-muted-foreground">
                Marca como fija para recibir recordatorios periódicos.
              </p>
            </div>
            <Checkbox
              checked={isFixed}
              onCheckedChange={(v) => setIsFixed(v === true)}
              aria-label="Marcar como transferencia fija"
            />
          </div>

          {isFixed && (
            <div className="grid grid-cols-1 gap-4 rounded-lg bg-background/50 p-2.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Periodicidad</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as FixedFrequency)}>
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
                  onChange={(e) => setDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
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
                  onChange={(e) => setReminderDays(e.target.value.replace(/\D/g, "").slice(0, 2))}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Guardar cambios" : "Registrar transferencia"}
          </Button>
        </DialogFooter>
      </form>
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

        {loadingAccounts && renderLoadingBody()}
        {!loadingAccounts && bankAccounts.length < 1 && renderInsufficientAccountsBody()}
        {!loadingAccounts && bankAccounts.length >= 1 && renderFormBody()}
      </DialogContent>
    </Dialog>
  );
}
