import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, subYears } from "date-fns";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
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
import { Combobox, type ComboboxGroup } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBankAccounts, useCategories, useFinancialLiabilities } from "@/lib/hooks/use-api";
import { useAuth } from "@/lib/auth";
import { parseCurrency } from "@/lib/format";
import { errorText } from "@/lib/i18n/errors";
import { cn } from "@/lib/utils";
import {
  recurringApi,
  type CreateRecurringTransactionDto,
  type RecurringMode,
  type RecurringTransaction,
  type UpdateRecurringTransactionDto,
} from "@/lib/api/finance";

type Kind = "expense" | "income" | "investment" | "account_transfer" | "debt";
type EndMode = "none" | "date" | "count";
type Currency = "COP" | "USD";
type Frequency = RecurringTransaction["frequency"];

export const KIND_LABELS: Record<Kind, string> = {
  expense: "Gasto",
  income: "Ingreso",
  investment: "Inversión",
  account_transfer: "Transferencia entre cuentas",
  debt: "Pago de deuda",
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

const MODES: { value: RecurringMode; label: string; hint: string }[] = [
  {
    value: "auto",
    label: "Automático",
    hint: "Sprig registra el movimiento en la fecha, sin preguntarte.",
  },
  {
    value: "confirm",
    label: "Por confirmar",
    hint: "Sprig lo deja pendiente y tú confirmas la fecha y el monto reales.",
  },
];

const END_MODES: { value: EndMode; label: string }[] = [
  { value: "none", label: "Sin fin" },
  { value: "date", label: "Fecha final" },
  { value: "count", label: "N veces" },
];

export function kindOf(r: Pick<RecurringTransaction, "type" | "destination_liability_id">): Kind {
  if (r.type !== "transfer") return r.type;
  return r.destination_liability_id ? "debt" : "account_transfer";
}

/** Crear o editar un recurrente puede generar movimientos y mover saldos de inmediato. */
export function invalidateRecurring(qc: QueryClient, userId: string | null | undefined) {
  for (const key of [
    "recurring",
    "transactions",
    "transaction-summary",
    "statements",
    "bank-accounts",
    "financial-liabilities",
  ]) {
    qc.invalidateQueries({ queryKey: [key, userId ?? ""] });
  }
}

const today = () => format(new Date(), "yyyy-MM-dd");
const str = (v: number | null | undefined) => (v == null ? "" : String(v));

function segmentClass(active: boolean) {
  return cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
    active
      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );
}

interface RecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring?: RecurringTransaction | null;
}

export function RecurringDialog({ open, onOpenChange, recurring }: RecurringDialogProps) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useBankAccounts();
  const { data: liabilities = [] } = useFinancialLiabilities();
  const isEditing = !!recurring;

  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  /** Solo ingreso; vacío = la del producto elegido. */
  const [currency, setCurrency] = useState<Currency | "">("");
  const [categoryId, setCategoryId] = useState("");
  /** No transferencias: "account:<id>" o "liability:<id>". Transferencias: id de la cuenta origen. */
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [startDate, setStartDate] = useState(today());
  const [mode, setMode] = useState<RecurringMode>("confirm");
  const [reminderDays, setReminderDays] = useState("1");
  const [endMode, setEndMode] = useState<EndMode>("none");
  const [endDate, setEndDate] = useState("");
  const [maxOccurrences, setMaxOccurrences] = useState("");

  useEffect(() => {
    if (!open) return;
    const r = recurring;
    const k = r ? kindOf(r) : "expense";
    setName(r?.name ?? "");
    setKind(k);
    setAmount(r ? String(r.amount) : "");
    setCurrency(r && k === "income" ? (r.currency as Currency) : "");
    setCategoryId(str(r?.category_id));
    if (!r) setSource("");
    else if (r.type === "transfer") setSource(str(r.origin_account_id));
    else if (r.account_id) setSource(`account:${r.account_id}`);
    else setSource(r.liability_id ? `liability:${r.liability_id}` : "");
    setDestination(str(k === "debt" ? r?.destination_liability_id : r?.destination_account_id));
    setFrequency(r?.frequency ?? "monthly");
    setStartDate(r?.start_date.slice(0, 10) ?? today());
    setMode(r?.mode ?? "confirm");
    setReminderDays(String(r?.reminder_days ?? 1));
    setEndMode(r?.end_date ? "date" : r?.max_occurrences ? "count" : "none");
    setEndDate(r?.end_date?.slice(0, 10) ?? "");
    setMaxOccurrences(str(r?.max_occurrences));
  }, [open, recurring]);

  const isTransfer = kind === "account_transfer" || kind === "debt";
  const amountValue = parseCurrency(amount);
  const reminder = Number(reminderDays);

  // Moneda del producto elegido; el ingreso puede tener otra y el API convierte con TRM.
  const [srcType, srcRef] = source.split(":");
  const productCurrency = (
    srcType === "account"
      ? accounts.find((a) => String(a.id) === srcRef)
      : liabilities.find((l) => String(l.id) === srcRef)
  )?.currency as Currency | undefined;
  const effectiveCurrency = currency || productCurrency;
  const convertsFx =
    !!productCurrency && !!effectiveCurrency && effectiveCurrency !== productCurrency;

  const missing = [
    !name.trim() && "el nombre",
    amountValue <= 0 && "un monto mayor a 0",
    // Una regla adoptada puede no tener cuenta ni pasivo: al editarla no se exigen.
    !source &&
      (isTransfer || !isEditing) &&
      (isTransfer ? "la cuenta de origen" : "la cuenta o el pasivo"),
    isTransfer && !destination && (kind === "debt" ? "el pasivo a pagar" : "la cuenta destino"),
    kind === "account_transfer" &&
      source &&
      source === destination &&
      "una cuenta destino distinta",
    !startDate && "la primera fecha",
    endMode === "date" && (!endDate || endDate < startDate) && "una fecha final desde la primera",
    endMode === "count" && !(Number(maxOccurrences) >= 1) && "cuántas veces (1 o más)",
    !(reminderDays !== "" && reminder >= 0 && reminder <= 30) && "la anticipación (0 a 30 días)",
  ].filter(Boolean) as string[];

  const categoryGroups = useMemo<ComboboxGroup[]>(() => {
    const groups: Record<string, ComboboxGroup> = {
      expense: { heading: "Gastos", items: [] },
      income: { heading: "Ingresos", items: [] },
      investment: { heading: "Inversiones", items: [] },
    };
    for (const c of categories) {
      groups[c.group_type ?? "expense"]?.items.push({ value: String(c.id), label: c.name });
    }
    return Object.values(groups).filter((g) => g.items.length > 0);
  }, [categories]);

  function endFields() {
    if (endMode === "date") return { end_date: endDate };
    if (endMode === "count") return { max_occurrences: Number(maxOccurrences) };
    return {};
  }

  function buildCreate(): CreateRecurringTransactionDto {
    const [srcKind, srcId] = source.split(":");
    const link = isTransfer
      ? {
          origin_account_id: Number(source),
          [kind === "debt" ? "destination_liability_id" : "destination_account_id"]:
            Number(destination),
        }
      : { [srcKind === "account" ? "account_id" : "liability_id"]: Number(srcId) };
    return {
      name: name.trim(),
      type: isTransfer ? "transfer" : (kind as "expense" | "income" | "investment"),
      amount: amountValue,
      category_id: categoryId ? Number(categoryId) : undefined,
      frequency,
      start_date: startDate,
      mode,
      reminder_days: reminder,
      ...(kind === "income" && effectiveCurrency ? { currency: effectiveCurrency } : {}),
      ...link,
      ...endFields(),
    };
  }

  function buildUpdate(r: RecurringTransaction): UpdateRecurringTransactionDto {
    const [srcKind, srcId] = source.split(":");
    const link = isTransfer
      ? { origin_account_id: Number(source) }
      : source
        ? {
            account_id: srcKind === "account" ? Number(srcId) : null,
            liability_id: srcKind === "liability" ? Number(srcId) : null,
          }
        : {};
    const category =
      categoryId !== str(r.category_id)
        ? { category_id: categoryId ? Number(categoryId) : null, subcategory_id: null }
        : {};
    return {
      name: name.trim(),
      amount: amountValue,
      mode,
      reminder_days: reminder,
      ...(kind === "income" && effectiveCurrency ? { currency: effectiveCurrency } : {}),
      ...link,
      ...category,
      ...(endMode === "none" ? { end_date: null, max_occurrences: null } : endFields()),
    };
  }

  const save = useMutation({
    mutationFn: () =>
      recurring
        ? recurringApi.update(userId!, recurring.id, buildUpdate(recurring))
        : recurringApi.create(userId!, buildCreate()),
    onSuccess: () => {
      invalidateRecurring(qc, userId);
      toast.success(isEditing ? "Recurrente actualizado" : "Recurrente creado");
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorText(err, "http.unknown")),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missing.length === 0) save.mutate();
  }

  const accountLabel = (a: (typeof accounts)[number]) =>
    `${a.bank_name} · ${a.masked_account_number} (${a.currency})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar recurrente" : "Nuevo recurrente"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Los cambios aplican a las próximas ocurrencias; lo ya registrado no cambia."
              : "Un movimiento que se repite: Sprig lo registra o te lo recuerda en cada fecha."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Tipo</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={isEditing}
                  aria-pressed={kind === k}
                  onClick={() => {
                    setKind(k);
                    setCurrency("");
                    setSource("");
                    setDestination("");
                  }}
                  className={segmentClass(kind === k)}
                >
                  {KIND_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rec-name">Nombre</Label>
              <Input
                id="rec-name"
                maxLength={120}
                placeholder="Ej. Arriendo, Spotify, Nómina"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Monto</Label>
              <CurrencyInput
                id="rec-amount"
                value={amount}
                onChange={setAmount}
                placeholder="0"
                prefix={effectiveCurrency === "USD" ? "US$" : "$"}
              />
              {kind === "income" ? (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="rec-currency">Moneda</Label>
                  <Select
                    value={effectiveCurrency ?? ""}
                    onValueChange={(v) => setCurrency(v as Currency)}
                  >
                    <SelectTrigger id="rec-currency">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                  {convertsFx && (
                    <p className="text-xs text-muted-foreground">
                      Se convierte a {productCurrency} con la TRM de cada fecha (aprox.; tu banco
                      puede usar otra tasa).
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  La moneda es la de la cuenta o el pasivo.
                </p>
              )}
            </div>

            {isTransfer ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="rec-origin">Cuenta de origen</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger id="rec-origin">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter(
                          // En edición el destino es fijo: no se ofrece como origen.
                          (a) =>
                            !(isEditing && kind === "account_transfer") ||
                            String(a.id) !== destination,
                        )
                        .map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {accountLabel(a)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec-destination">
                    {kind === "debt" ? "Pasivo a pagar" : "Cuenta destino"}
                  </Label>
                  <Select value={destination} onValueChange={setDestination} disabled={isEditing}>
                    <SelectTrigger id="rec-destination">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {kind === "debt"
                        ? liabilities.map((l) => (
                            <SelectItem key={l.id} value={String(l.id)}>
                              {l.name} ({l.currency})
                            </SelectItem>
                          ))
                        : accounts.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {accountLabel(a)}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="rec-source">Cuenta o pasivo</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger id="rec-source">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Cuentas</SelectLabel>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={`account:${a.id}`}>
                          {accountLabel(a)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Pasivos (p. ej. tarjeta de crédito)</SelectLabel>
                      {liabilities.map((l) => (
                        <SelectItem key={l.id} value={`liability:${l.id}`}>
                          {l.name} ({l.currency})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rec-category">Categoría</Label>
              <Combobox
                id="rec-category"
                value={categoryId}
                onValueChange={setCategoryId}
                groups={categoryGroups}
                placeholder="Sin categoría"
                searchPlaceholder="Buscar categoría..."
                emptyText="Sin resultados"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-frequency">Periodicidad</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as Frequency)}
                disabled={isEditing}
              >
                <SelectTrigger id="rec-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                    <SelectItem key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-start">Primera fecha</Label>
              <Input
                id="rec-start"
                type="date"
                min={format(subYears(new Date(), 1), "yyyy-MM-dd")}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isEditing}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-reminder">Anticipación del aviso (días)</Label>
              <Input
                id="rec-reminder"
                type="number"
                min={0}
                max={30}
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Modo</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={mode === m.value}
                  onClick={() => setMode(m.value)}
                  className={cn(segmentClass(mode === m.value), "text-left")}
                >
                  <span className="block">{m.label}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{m.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Termina</p>
            <div className="grid grid-cols-3 gap-2">
              {END_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={endMode === m.value}
                  onClick={() => setEndMode(m.value)}
                  className={segmentClass(endMode === m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {endMode === "date" && (
              <Input
                aria-label="Fecha final"
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            )}
            {endMode === "count" && (
              <Input
                aria-label="Número de veces"
                type="number"
                min={Math.max(1, recurring?.occurrences_count ?? 1)}
                placeholder="Ej. 12"
                value={maxOccurrences}
                onChange={(e) => setMaxOccurrences(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            )}
          </div>

          {missing.length > 0 && (
            <p className="text-xs text-muted-foreground">Falta: {missing.join(", ")}.</p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={missing.length > 0 || save.isPending}
              className="bg-gradient-primary text-primary-foreground hover:brightness-105"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
