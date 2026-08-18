import { useState, useEffect } from "react";
import { Loader2, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle2, Info } from "lucide-react";
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
import { Badge } from "@/components/ui/primitives";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateObjective,
  useUpdateObjective,
  useCalculateQuota,
  useBankAccounts,
  type CalculateQuotaResponse,
} from "@/lib/hooks/use-api";
import type { FinancialObjective, QuotaFrequency } from "@/lib/api/finance";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WealthDialog } from "./WealthDialog";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ahorros: "Ahorros",
  corriente: "Corriente",
  inversion: "Inversión",
  fna: "FNA",
  aporte_pension_voluntaria: "APV",
  otro: "Otro",
};

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: FinancialObjective | null;
  onCreated?: (objective: FinancialObjective) => void;
}

const goalTypes = [
  { value: "savings", label: "Ahorro" },
  { value: "loan", label: "Préstamo" },
  { value: "goal", label: "Meta" },
];

const frequencyOptions: { value: QuotaFrequency; label: string; perMonth: string }[] = [
  { value: "weekly", label: "Semanal", perMonth: "~4.33/mes" },
  { value: "biweekly", label: "Quincenal", perMonth: "~2.17/mes" },
  { value: "monthly", label: "Mensual", perMonth: "1/mes" },
];

function formatPlazo(q: CalculateQuotaResponse): string {
  if (typeof q.days_in_period === "number" && q.days_in_period > 0) {
    return `${Math.round(q.days_in_period / 30)} meses`;
  }
  if (q.end_date) {
    const months = Math.max(
      1,
      Math.round(
        (new Date(q.end_date).getTime() - new Date(q.start_date).getTime()) /
          (1000 * 60 * 60 * 24 * 30),
      ),
    );
    return `${months} meses`;
  }
  return "Sin fecha fin";
}

function getDialogTitle(isEditing: boolean, step: number): string {
  if (isEditing) return "Editar Meta";
  if (step === 1) return "Nueva Meta";
  return "Confirmar creación";
}

function getDialogDescription(isEditing: boolean, step: number): string {
  if (isEditing) return "Modifica los datos de tu meta financiera.";
  if (step === 1) return "Define una nueva meta de ahorro o préstamo.";
  return "Revisa el plan de ahorro antes de crear la meta.";
}

/* ── Step indicator ─────────────────────────────────────────────────────────── */
function GoalStepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
          step === 1
            ? "bg-primary text-primary-foreground"
            : "bg-surface-2 text-muted-foreground",
        )}
      >
        1
      </div>
      <div className={cn("h-px flex-1", step === 1 ? "bg-border" : "bg-primary")} />
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
          step === 2
            ? "bg-primary text-primary-foreground"
            : "bg-surface-2 text-muted-foreground",
        )}
      >
        2
      </div>
    </div>
  );
}

/* ── Shared form fields (used by Step 1 and EditForm) ──────────────────────── */
interface GoalFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  targetAmount: string;
  setTargetAmount: (v: string) => void;
  currentBalance: string;
  setCurrentBalance: (v: string) => void;
  startDate: Date | undefined;
  setStartDate: (v: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (v: Date | undefined) => void;
  frequency: QuotaFrequency;
  setFrequency: (v: QuotaFrequency) => void;
  accountId: string;
  setAccountId: (v: string) => void;
  interestRate: string;
  setInterestRate: (v: string) => void;
  accounts: Array<{
    id: number;
    bank_name: string;
    account_type: string;
    masked_account_number: string;
    annual_interest_rate?: number | null;
  }>;
  selectedAccount?: {
    annual_interest_rate?: number | null;
  } | null;
  showAccountHint?: boolean;
  onQuickCreateAccount?: () => void;
}

function GoalFormFields({
  name,
  setName,
  type,
  setType,
  targetAmount,
  setTargetAmount,
  currentBalance,
  setCurrentBalance,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  frequency,
  setFrequency,
  accountId,
  setAccountId,
  interestRate,
  setInterestRate,
  accounts,
  selectedAccount,
  showAccountHint = true,
  onQuickCreateAccount,
}: GoalFormFieldsProps) {
  const handleAccountChange = (v: string) => {
    if (v === "__new_account__") {
      onQuickCreateAccount?.();
      return;
    }
    setAccountId(v);
  };

  return (
    <>
      <div className="space-y-1.5">
        <Label>Nombre</Label>
        <Input
          placeholder="Ej. Ahorrar para la moto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {goalTypes.map((gt) => (
              <SelectItem key={gt.value} value={gt.value}>
                {gt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Monto objetivo</Label>
          <CurrencyInput value={targetAmount} onChange={setTargetAmount} placeholder="0" required />
        </div>
        <div className="space-y-1.5">
          <Label>Ahorrado actual</Label>
          <CurrencyInput value={currentBalance} onChange={setCurrentBalance} placeholder="0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Fecha inicio</Label>
          <DatePicker value={startDate} onChange={setStartDate} placeholder="Seleccionar" />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha fin</Label>
          <DatePicker value={endDate} onChange={setEndDate} placeholder="Seleccionar" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Frecuencia de cuotas</Label>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as QuotaFrequency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {frequencyOptions.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label} <span className="ml-1 text-xs text-muted-foreground">({f.perMonth})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Cuenta bancaria (opcional)</Label>
        <Select value={accountId} onValueChange={handleAccountChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sin cuenta vinculada" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={String(acc.id)}>
                {acc.bank_name} · {ACCOUNT_TYPE_LABELS[acc.account_type] ?? acc.account_type} ·{" "}
                {acc.masked_account_number}
                {acc.annual_interest_rate != null ? ` (${acc.annual_interest_rate}%)` : ""}
              </SelectItem>
            ))}
            <SelectItem value="__new_account__">＋ Crear cuenta bancaria…</SelectItem>
          </SelectContent>
        </Select>
        {showAccountHint && selectedAccount?.annual_interest_rate != null && !interestRate && (
          <p className="text-xs text-muted-foreground">
            Se usará la tasa de la cuenta: {selectedAccount.annual_interest_rate}% anual.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Tasa de interés anual % (opcional)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          placeholder="Ej. 5.5"
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
        />
        {showAccountHint && (
          <p className="text-xs text-muted-foreground">
            Si dejas la cuenta vinculada y no escribes tasa, se toma la de la cuenta.
          </p>
        )}
      </div>
    </>
  );
}

/* ── Step 1: create form ────────────────────────────────────────────────────── */
interface GoalStep1FormProps {
  formFields: Omit<GoalFormFieldsProps, "showAccountHint">;
  onCalculate: () => void;
  isCalculatePending: boolean;
  isStep1Valid: boolean;
}

function GoalStep1Form({
  formFields,
  onCalculate,
  isCalculatePending,
  isStep1Valid,
}: GoalStep1FormProps) {
  return (
    <div className="space-y-4">
      <GoalFormFields showAccountHint {...formFields} />
      <DialogFooter>
        <Button
          type="button"
          onClick={onCalculate}
          disabled={!isStep1Valid || isCalculatePending}
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          {isCalculatePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Siguiente
              <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ── Confirmation summary grid ──────────────────────────────────────────────── */
function ConfirmationSummary({ result }: { result: CalculateQuotaResponse }) {
  const hasIncome = typeof result.monthly_income === "number";

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <SummaryCell label="Monto a ahorrar" value={fmtCurrency(result.amount_to_save)} />
      <SummaryCell label="Saldo actual" value={fmtCurrency(result.current_balance)} />
      {hasIncome && (
        <>
          <SummaryCell label="Ingreso mensual" value={fmtCurrency(result.monthly_income!)} />
          <SummaryCell
            label="Máx. recomendado"
            value={result.max_allowed_per_period ? fmtCurrency(result.max_allowed_per_period) : "—"}
          />
        </>
      )}
      <SummaryCell label="Plazo" value={formatPlazo(result)} />
      <SummaryCell label="Perfil financiero">
        <div className="flex items-center gap-1.5">
          {result.has_financial_profile ? (
            <Badge tone="success">Registrado</Badge>
          ) : (
            <Badge tone="warning">Sin registrar</Badge>
          )}
        </div>
      </SummaryCell>
      {result.projected_final_balance != null && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-muted-foreground">Saldo proyectado</p>
          <p className="font-semibold text-primary tabular-nums">
            {fmtCurrency(result.projected_final_balance)}
          </p>
        </div>
      )}
      {result.current_profitability != null && (
        <SummaryCell label="Tasa anual" value={`${result.current_profitability}%`} mono />
      )}
      {result.bank && (
        <div className="col-span-2 rounded-lg bg-surface p-3">
          <p className="text-muted-foreground">Cuenta vinculada</p>
          <p className="font-semibold">{result.bank}</p>
        </div>
      )}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  children,
  mono,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <p className="text-muted-foreground">{label}</p>
      {children ?? (
        <p className={cn("font-semibold", mono && "tabular-nums")}>{value}</p>
      )}
    </div>
  );
}

/* ── Budget status banner ───────────────────────────────────────────────────── */
function BudgetStatus({ isWithinBudget }: { isWithinBudget: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 text-sm",
        isWithinBudget
          ? "border-success/30 bg-success/5 text-success"
          : "border-warning/30 bg-warning/5 text-warning",
      )}
    >
      {isWithinBudget ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <p>
        {isWithinBudget
          ? "Tu cuota está dentro del 20% recomendado de tu ingreso mensual."
          : "La cuota excede el 20% recomendado de tu ingreso mensual."}
      </p>
    </div>
  );
}

/* ── Warning / recommendation lists ─────────────────────────────────────────── */
function AlertCardList({
  items,
  variant,
}: {
  items: string[];
  variant: "warning" | "info";
}) {
  const isWarning = variant === "warning";
  return (
    <div className="space-y-2">
      {items.map((text, i) => (
        <div
          key={`${variant}-${text}`}
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-sm",
            isWarning
              ? "border-warning/30 bg-warning/5 text-warning"
              : "border-primary/20 bg-primary/5 text-muted-foreground",
          )}
        >
          {isWarning ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          )}
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Step 2: confirmation view ──────────────────────────────────────────────── */
function GoalStep2Confirm({
  result,
  frequencyLabel,
  isPending,
  confirmButtonLabel,
  onBack,
  onConfirm,
}: {
  result: CalculateQuotaResponse;
  frequencyLabel: string;
  isPending: boolean;
  confirmButtonLabel: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const warnings = result.warnings ?? [];
  const recommendations = result.recommendations ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Cuota por {frequencyLabel.toLowerCase()}
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-primary">
          {fmtCurrency(result.quota_amount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {result.total_periods} cuotas · {frequencyLabel}
        </p>
      </div>

      <ConfirmationSummary result={result} />

      {result.is_within_budget != null && <BudgetStatus isWithinBudget={result.is_within_budget} />}

      {warnings.length > 0 && <AlertCardList items={warnings} variant="warning" />}

      {recommendations.length > 0 && (
        <AlertCardList items={recommendations} variant="info" />
      )}

      <DialogFooter className="!justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isPending}
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmButtonLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ── Edit form (wraps shared fields) ────────────────────────────────────────── */
function EditForm({
  formFields,
  onSubmit,
  isPending,
}: {
  formFields: Omit<GoalFormFieldsProps, "showAccountHint">;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <GoalFormFields showAccountHint={false} {...formFields} />
      <DialogFooter>
        <Button
          type="submit"
          disabled={
            !formFields.name.trim() ||
            !formFields.targetAmount ||
            Number(formFields.targetAmount) <= 0 ||
            isPending
          }
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Actualizar
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ── Main GoalDialog ────────────────────────────────────────────────────────── */
function isValidFrequency(f: string): f is QuotaFrequency {
  return f === "weekly" || f === "biweekly" || f === "monthly";
}

function getInitialInterestRate(goal: FinancialObjective): string {
  if (goal.current_profitability != null) return String(goal.current_profitability);
  if (goal.interest_rate != null) return String(goal.interest_rate);
  return "";
}

export function GoalDialog({ open, onOpenChange, goal, onCreated }: GoalDialogProps) {
  const createGoal = useCreateObjective();
  const updateGoal = useUpdateObjective();
  const calculateQuota = useCalculateQuota();
  const { data: accounts = [] } = useBankAccounts();
  const [quickAccountOpen, setQuickAccountOpen] = useState(false);

  const isEditing = !!goal;
  const isPending = createGoal.isPending || updateGoal.isPending;

  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [type, setType] = useState<string>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [frequency, setFrequency] = useState<QuotaFrequency>("monthly");
  const [accountId, setAccountId] = useState<string>("");
  const [interestRate, setInterestRate] = useState("");

  const [quotaResult, setQuotaResult] = useState<CalculateQuotaResponse | null>(null);

  const selectedAccount = accounts.find((a) => String(a.id) === accountId);

  useEffect(() => {
    if (!goal) {
      reset();
      return;
    }
    setName(goal.name);
    setType(goal.type);
    setTargetAmount(String(goal.target_amount));
    setCurrentBalance(String(goal.current_balance ?? 0));
    setStartDate(goal.start_date ? new Date(goal.start_date) : undefined);
    setEndDate(goal.end_date ? new Date(goal.end_date) : undefined);
    if (isValidFrequency(goal.frequency)) {
      setFrequency(goal.frequency);
    }
    setAccountId(goal.account_id ? String(goal.account_id) : "");
    setInterestRate(getInitialInterestRate(goal));
  }, [goal, open]);

  function reset() {
    setName("");
    setType("savings");
    setTargetAmount("");
    setCurrentBalance("");
    setStartDate(undefined);
    setEndDate(undefined);
    setFrequency("monthly");
    setAccountId("");
    setInterestRate("");
    setStep(1);
    setQuotaResult(null);
  }

  async function handleCalculate() {
    if (!targetAmount || Number(targetAmount) <= 0) return;

    const id = toast.loading("Calculando cuota de ahorro...");
    try {
      const result = await calculateQuota.mutateAsync({
        target_amount: Number(targetAmount),
        current_balance: currentBalance ? Number(currentBalance) : 0,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        frequency,
        account_id: accountId ? Number(accountId) : undefined,
        interest_rate: interestRate ? Number(interestRate) : undefined,
      });
      setQuotaResult(result);
      setStep(2);
      toast.dismiss(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al calcular cuota", { id });
    }
  }

  async function handleConfirmCreate() {
    if (!name.trim() || !targetAmount || Number(targetAmount) <= 0) return;

    const payload = {
      name: name.trim(),
      type: type as "savings" | "loan" | "goal",
      target_amount: Number(targetAmount),
      current_balance: currentBalance ? Number(currentBalance) : 0,
      start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
      frequency,
      account_id: accountId ? Number(accountId) : undefined,
      current_profitability: interestRate ? Number(interestRate) : undefined,
    };

    if (isEditing) {
      await updateGoal.mutateAsync(
        { id: String(goal.id), dto: payload },
        {
          onSuccess: () => {
            toast.success("Meta actualizada");
            reset();
            onOpenChange(false);
          },
          onError: () => toast.error("Error al actualizar la meta"),
        },
      );
    } else {
      await createGoal.mutateAsync(payload, {
        onSuccess: (created) => {
          toast.success("Meta creada");
          reset();
          onCreated?.(created);
          onOpenChange(false);
        },
        onError: () => toast.error("Error al crear la meta"),
      });
    }
  }

  const frequencyLabel = frequencyOptions.find((f) => f.value === frequency)?.label ?? frequency;
  const isStep1Valid = !!name.trim() && !!targetAmount && Number(targetAmount) > 0;

  const formFields: Omit<GoalFormFieldsProps, "showAccountHint"> = {
    name, setName,
    type, setType,
    targetAmount, setTargetAmount,
    currentBalance, setCurrentBalance,
    startDate, setStartDate,
    endDate, setEndDate,
    frequency, setFrequency,
    accountId, setAccountId,
    interestRate, setInterestRate,
    accounts,
    selectedAccount,
    onQuickCreateAccount: () => setQuickAccountOpen(true),
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) reset();
          onOpenChange(v);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{getDialogTitle(isEditing, step)}</DialogTitle>
            <DialogDescription>{getDialogDescription(isEditing, step)}</DialogDescription>
            {!isEditing && <GoalStepIndicator step={step} />}
          </DialogHeader>

          {(() => {
            if (isEditing) {
              return (
                <EditForm
                  formFields={formFields}
                  onSubmit={handleConfirmCreate}
                  isPending={isPending}
                />
              );
            }
            if (step === 1) {
              return (
                <GoalStep1Form
                  formFields={formFields}
                  onCalculate={handleCalculate}
                  isCalculatePending={calculateQuota.isPending}
                  isStep1Valid={isStep1Valid}
                />
              );
            }
            return (
              quotaResult && (
                <GoalStep2Confirm
                  result={quotaResult}
                  frequencyLabel={frequencyLabel}
                  isPending={isPending}
                  confirmButtonLabel={isEditing ? "Actualizar" : "Crear meta"}
                  onBack={() => setStep(1)}
                  onConfirm={handleConfirmCreate}
                />
              )
            );
          })()}
        </DialogContent>
      </Dialog>

      <WealthDialog
        open={quickAccountOpen}
        onOpenChange={(v) => {
          if (!v) setQuickAccountOpen(false);
        }}
        entityType="account"
        onCreated={(acc) => {
          if ("id" in acc) setAccountId(String(acc.id));
        }}
      />
    </>
  );
}
