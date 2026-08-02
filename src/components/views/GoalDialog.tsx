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
  type CalculateQuotaResponse,
} from "@/lib/hooks/use-api";
import type { FinancialObjective, QuotaFrequency } from "@/lib/api/finance";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: FinancialObjective | null;
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

export function GoalDialog({ open, onOpenChange, goal }: GoalDialogProps) {
  const createGoal = useCreateObjective();
  const updateGoal = useUpdateObjective();
  const calculateQuota = useCalculateQuota();

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

  const [quotaResult, setQuotaResult] = useState<CalculateQuotaResponse | null>(null);

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setType(goal.type);
      setTargetAmount(String(goal.target_amount));
      setCurrentBalance(String(goal.current_balance ?? 0));
      setStartDate(goal.start_date ? new Date(goal.start_date) : undefined);
      setEndDate(goal.end_date ? new Date(goal.end_date) : undefined);
      if (
        goal.frequency === "weekly" ||
        goal.frequency === "biweekly" ||
        goal.frequency === "monthly"
      ) {
        setFrequency(goal.frequency);
      }
    } else {
      reset();
    }
  }, [goal, open]);

  function reset() {
    setName("");
    setType("savings");
    setTargetAmount("");
    setCurrentBalance("");
    setStartDate(undefined);
    setEndDate(undefined);
    setFrequency("monthly");
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
        onSuccess: () => {
          toast.success("Meta creada");
          reset();
          onOpenChange(false);
        },
        onError: () => toast.error("Error al crear la meta"),
      });
    }
  }

  const frequencyLabel = frequencyOptions.find((f) => f.value === frequency)?.label ?? frequency;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Meta" : step === 1 ? "Nueva Meta" : "Confirmar creación"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de tu meta financiera."
              : step === 1
                ? "Define una nueva meta de ahorro o préstamo."
                : "Revisa el plan de ahorro antes de crear la meta."}
          </DialogDescription>
          {!isEditing && (
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
          )}
        </DialogHeader>

        {isEditing ? (
          /* ── Edit mode: simple form ──────────────────────────────────── */
          <EditForm
            name={name}
            setName={setName}
            type={type}
            setType={setType}
            targetAmount={targetAmount}
            setTargetAmount={setTargetAmount}
            currentBalance={currentBalance}
            setCurrentBalance={setCurrentBalance}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onSubmit={handleConfirmCreate}
            isPending={isPending}
          />
        ) : step === 1 ? (
          /* ── Step 1: form ─────────────────────────────────────────────── */
          <div className="space-y-4">
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
                <CurrencyInput
                  value={targetAmount}
                  onChange={setTargetAmount}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ahorrado actual</Label>
                <CurrencyInput
                  value={currentBalance}
                  onChange={setCurrentBalance}
                  placeholder="0"
                />
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
                      {f.label}{" "}
                      <span className="ml-1 text-xs text-muted-foreground">({f.perMonth})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleCalculate}
                disabled={
                  !name.trim() ||
                  !targetAmount ||
                  Number(targetAmount) <= 0 ||
                  calculateQuota.isPending
                }
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {calculateQuota.isPending ? (
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
        ) : (
          /* ── Step 2: confirmation ────────────────────────────────────── */
          quotaResult && (
            <div className="space-y-4">
              {/* Quota card */}
              <div className="rounded-xl border border-border bg-surface p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Cuota por {frequencyLabel.toLowerCase()}
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-primary">
                  {fmtCurrency(quotaResult.quota_amount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {quotaResult.total_periods} cuotas · {frequencyLabel}
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-surface p-3">
                  <p className="text-muted-foreground">Monto a ahorrar</p>
                  <p className="font-semibold">{fmtCurrency(quotaResult.amount_to_save)}</p>
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <p className="text-muted-foreground">Saldo actual</p>
                  <p className="font-semibold">{fmtCurrency(quotaResult.current_balance)}</p>
                </div>
                {typeof quotaResult.monthly_income === "number" && (
                  <>
                    <div className="rounded-lg bg-surface p-3">
                      <p className="text-muted-foreground">Ingreso mensual</p>
                      <p className="font-semibold">{fmtCurrency(quotaResult.monthly_income)}</p>
                    </div>
                    <div className="rounded-lg bg-surface p-3">
                      <p className="text-muted-foreground">Máx. recomendado</p>
                      <p className="font-semibold">
                        {quotaResult.max_allowed_per_period
                          ? fmtCurrency(quotaResult.max_allowed_per_period)
                          : "—"}
                      </p>
                    </div>
                  </>
                )}
                <div className="rounded-lg bg-surface p-3">
                  <p className="text-muted-foreground">Plazo</p>
                  <p className="font-semibold">{formatPlazo(quotaResult)}</p>
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <p className="text-muted-foreground">Perfil financiero</p>
                  <div className="flex items-center gap-1.5">
                    {quotaResult.has_financial_profile ? (
                      <Badge tone="success">Registrado</Badge>
                    ) : (
                      <Badge tone="warning">Sin registrar</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Budget status */}
              {quotaResult.is_within_budget != null && (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-sm",
                    quotaResult.is_within_budget
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-warning/30 bg-warning/5 text-warning",
                  )}
                >
                  {quotaResult.is_within_budget ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <p>
                    {quotaResult.is_within_budget
                      ? "Tu cuota está dentro del 20% recomendado de tu ingreso mensual."
                      : "La cuota excede el 20% recomendado de tu ingreso mensual."}
                  </p>
                </div>
              )}

              {/* Warnings */}
              {(quotaResult.warnings ?? []).length > 0 && (
                <div className="space-y-2">
                  {(quotaResult.warnings ?? []).map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {(quotaResult.recommendations ?? []).length > 0 && (
                <div className="space-y-2">
                  {(quotaResult.recommendations ?? []).map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground"
                    >
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p>{r}</p>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter className="!justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={isPending}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Volver
                </Button>
                <Button
                  onClick={handleConfirmCreate}
                  disabled={isPending}
                  className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEditing ? "Actualizar" : "Crear meta"}
                </Button>
              </DialogFooter>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Reused edit form (inline, same as before) ─────────────────────────────── */
function EditForm({
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
  onSubmit,
  isPending,
}: {
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

      <DialogFooter>
        <Button
          type="submit"
          disabled={!name.trim() || !targetAmount || Number(targetAmount) <= 0 || isPending}
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Actualizar
        </Button>
      </DialogFooter>
    </form>
  );
}
