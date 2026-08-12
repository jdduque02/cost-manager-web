import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateBankAccount,
  useUpdateBankAccount,
  useCreateFinancialAsset,
  useUpdateFinancialAsset,
  useCreateFinancialLiability,
  useUpdateFinancialLiability,
} from "@/lib/hooks/use-api";
import type {
  BankAccount,
  FinancialAsset,
  FinancialLiability,
  AccountType,
  AssetType,
  LiabilityType,
} from "@/lib/api/banking";

type EntityType = "account" | "asset" | "liability";

interface WealthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entity?: BankAccount | FinancialAsset | FinancialLiability | null;
  onCreated?: (entity: BankAccount | FinancialAsset | FinancialLiability) => void;
}

const accountTypes: { value: AccountType; label: string }[] = [
  { value: "ahorros", label: "Ahorros" },
  { value: "corriente", label: "Corriente" },
  { value: "inversion", label: "Inversión" },
  { value: "cdt", label: "CDT / Inversión" },
  { value: "ahorro_alto_rendimiento", label: "Cuenta de ahorro de alto rendimiento" },
  { value: "fna", label: "FNA - Fondo Nacional del Ahorro" },
  { value: "aporte_pension_voluntaria", label: "Aporte Pensión Voluntaria" },
  { value: "otro", label: "Otro" },
];

const assetTypes: { value: AssetType; label: string }[] = [
  { value: "acciones", label: "Acciones" },
  { value: "acciones_fraccion", label: "Acciones / Fracciones" },
  { value: "ahorro_alto_rendimiento", label: "Cuenta de ahorro de alto rendimiento" },
  { value: "bienes_raices", label: "Bienes raíces" },
  { value: "bienes_materiales", label: "Bienes materiales" },
  { value: "vehiculos", label: "Vehículos" },
  { value: "joyas_metales", label: "Joyas y metales" },
  { value: "arte_colecciones", label: "Arte y colecciones" },
  { value: "propiedad_intelectual", label: "Propiedad intelectual" },
  { value: "fondos_inversion", label: "Fondos de inversión" },
  { value: "cryptomonedas", label: "Criptomonedas" },
  { value: "efectivo", label: "Efectivo" },
  { value: "otro", label: "Otro" },
];

const liabilityTypes: { value: LiabilityType; label: string }[] = [
  { value: "credito_hipotecario", label: "Crédito hipotecario" },
  { value: "credito_consumo", label: "Crédito de consumo" },
  { value: "tarjeta_credito", label: "Tarjeta de crédito" },
  { value: "prestamo_personal", label: "Préstamo personal" },
  { value: "otro", label: "Otro" },
];

const currencies: { value: string; label: string }[] = [
  { value: "COP", label: "COP - Peso colombiano" },
  { value: "USD", label: "USD - Dólar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "MXN", label: "MXN - Peso mexicano" },
];

const entityLabels: Record<EntityType, { create: string; edit: string; title: string }> = {
  account: { create: "Nueva Cuenta", edit: "Editar Cuenta", title: "Cuenta bancaria" },
  asset: { create: "Nuevo Activo", edit: "Editar Activo", title: "Activo financiero" },
  liability: { create: "Nueva Deuda", edit: "Editar Deuda", title: "Pasivo financiero" },
};

export function WealthDialog({
  open,
  onOpenChange,
  entityType,
  entity,
  onCreated,
}: WealthDialogProps) {
  const createAccount = useCreateBankAccount();
  const updateAccount = useUpdateBankAccount();
  const createAsset = useCreateFinancialAsset();
  const updateAsset = useUpdateFinancialAsset();
  const createLiability = useCreateFinancialLiability();
  const updateLiability = useUpdateFinancialLiability();

  const isEditing = !!entity;
  const labels = entityLabels[entityType];

  const isPending =
    createAccount.isPending ||
    updateAccount.isPending ||
    createAsset.isPending ||
    updateAsset.isPending ||
    createLiability.isPending ||
    updateLiability.isPending;

  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<string>("ahorros");
  const [accountNumber, setAccountNumber] = useState("");
  const [assetType, setAssetType] = useState<string>("acciones");
  const [liabilityType, setLiabilityType] = useState<string>("tarjeta_credito");
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [yieldFrequency, setYieldFrequency] = useState("monthly");
  const [isPrimary, setIsPrimary] = useState(false);
  const [exempt4x1000, setExempt4x1000] = useState(false);
  const [currency, setCurrency] = useState("COP");
  const [symbol, setSymbol] = useState("");
  const [quoteSource, setQuoteSource] = useState("yahoo");
  const [currentYield, setCurrentYield] = useState("");

  useEffect(() => {
    if (entity) {
      if (entityType === "account") {
        const a = entity as BankAccount;
        setBankName(a.bank_name);
        setAccountType(a.account_type);
        setAccountNumber("");
        setAmount(String(Number(a.display_balance ?? 0)));
        setCurrency(a.currency ?? "COP");
        setIsPrimary(a.is_primary);
        setExempt4x1000(a.exempt_4x1000);
        setAnnualRate(a.annual_interest_rate != null ? String(a.annual_interest_rate) : "");
        setYieldFrequency(a.yield_frequency ?? "monthly");
      } else if (entityType === "asset") {
        const a = entity as FinancialAsset;
        setName(a.name);
        setAssetType(a.asset_type);
        setAmount(String(a.current_value));
        setCurrency(a.currency ?? "COP");
        setSymbol(a.symbol ?? "");
        setQuoteSource(a.quote_source ?? "yahoo");
        setCurrentYield(a.current_yield != null ? String(a.current_yield) : "");
      } else {
        const l = entity as FinancialLiability;
        setName(l.name);
        setLiabilityType(l.liability_type);
        setAmount(String(l.current_balance));
        setInterestRate(String(l.interest_rate ?? ""));
        setCurrency(l.currency ?? "COP");
      }
    } else {
      reset();
    }
  }, [entity, open, entityType]);

  function reset() {
    setName("");
    setBankName("");
    setAccountType("ahorros");
    setAccountNumber("");
    setAssetType("acciones");
    setLiabilityType("tarjeta_credito");
    setAmount("");
    setInterestRate("");
    setAnnualRate("");
    setYieldFrequency("monthly");
    setIsPrimary(false);
    setExempt4x1000(false);
    setCurrency("COP");
    setSymbol("");
    setQuoteSource("yahoo");
    setCurrentYield("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (entityType === "account") {
      const dto = {
        bank_name: bankName,
        account_type: accountType as AccountType,
        account_number: accountNumber || "0000",
        balance: Number(amount) || 0,
        currency: currency !== "COP" ? currency : undefined,
        annual_interest_rate: annualRate ? Number(annualRate) : undefined,
        yield_frequency: yieldFrequency,
        is_primary: isPrimary,
        exempt_4x1000: exempt4x1000,
      };
      if (isEditing) {
        await updateAccount.mutateAsync(
          { id: String(entity.id), dto },
          {
            onSuccess: () => {
              toast.success("Cuenta actualizada");
              reset();
              onOpenChange(false);
            },
            onError: () => toast.error("Error al actualizar la cuenta"),
          },
        );
      } else {
        await createAccount.mutateAsync(dto, {
          onSuccess: (created) => {
            toast.success("Cuenta creada");
            reset();
            onCreated?.(created);
            onOpenChange(false);
          },
          onError: () => toast.error("Error al crear la cuenta"),
        });
      }
    } else if (entityType === "asset") {
      const dto = {
        asset_type: assetType as AssetType,
        name: name.trim(),
        current_value: Number(amount) || 0,
        current_yield: currentYield ? Number(currentYield) : undefined,
        currency: currency !== "COP" ? currency : undefined,
        symbol: symbol.trim() || undefined,
        quote_source: symbol.trim() ? (quoteSource as "yahoo" | "coingecko") : undefined,
      };
      if (isEditing) {
        await updateAsset.mutateAsync(
          { id: String(entity.id), dto },
          {
            onSuccess: () => {
              toast.success("Activo actualizado");
              reset();
              onOpenChange(false);
            },
            onError: () => toast.error("Error al actualizar el activo"),
          },
        );
      } else {
        await createAsset.mutateAsync(dto, {
          onSuccess: (created) => {
            toast.success("Activo creado");
            reset();
            onCreated?.(created);
            onOpenChange(false);
          },
          onError: () => toast.error("Error al crear el activo"),
        });
      }
    } else {
      const dto = {
        liability_type: liabilityType as LiabilityType,
        name: name.trim(),
        current_balance: Number(amount) || 0,
        interest_rate: interestRate ? Number(interestRate) : undefined,
        currency: currency !== "COP" ? currency : undefined,
      };
      if (isEditing) {
        await updateLiability.mutateAsync(
          { id: String(entity.id), dto },
          {
            onSuccess: () => {
              toast.success("Deuda actualizada");
              reset();
              onOpenChange(false);
            },
            onError: () => toast.error("Error al actualizar la deuda"),
          },
        );
      } else {
        await createLiability.mutateAsync(dto, {
          onSuccess: (created) => {
            toast.success("Deuda creada");
            reset();
            onCreated?.(created);
            onOpenChange(false);
          },
          onError: () => toast.error("Error al crear la deuda"),
        });
      }
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
          <DialogTitle>{isEditing ? labels.edit : labels.create}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Modifica los datos del ${labels.title.toLowerCase()}.`
              : `Registra un nuevo ${labels.title.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {entityType === "account" && (
            <>
              <div className="space-y-1.5">
                <Label>Banco</Label>
                <Input
                  placeholder="Ej. Bancolombia"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nombre de la entidad bancaria donde tienes la cuenta.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de cuenta</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecciona el tipo de cuenta que deseas registrar.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Número de cuenta</Label>
                <Input
                  placeholder="Opcional"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Opcional. Solo visible para ti.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Saldo</Label>
                <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
                <p className="text-xs text-muted-foreground">
                  Saldo actual disponible en la cuenta.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Tasa de interés anual %</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Rentabilidad anual que genera la cuenta (para proyecciones).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Frecuencia del rendimiento</Label>
                <Select value={yieldFrequency} onValueChange={setYieldFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diaria</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cada cuanto se entrega el rendimiento en la cuenta.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Moneda en la que está denominada la cuenta.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Cuenta principal</p>
                  <p className="text-xs text-muted-foreground">
                    Marca esta cuenta como tu cuenta principal.
                  </p>
                </div>
                <Checkbox
                  checked={isPrimary}
                  onCheckedChange={(v) => setIsPrimary(v === true)}
                  aria-label="Marcar como cuenta principal"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Exenta del 4x1000</p>
                  <p className="text-xs text-muted-foreground">
                    Cuenta exenta del impuesto a los movimientos financieros (GMF).
                  </p>
                </div>
                <Checkbox
                  checked={exempt4x1000}
                  onCheckedChange={(v) => setExempt4x1000(v === true)}
                  aria-label="Marcar como exenta del 4x1000"
                />
              </div>
            </>
          )}
          {entityType === "asset" && (
            <>
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  placeholder="Ej. Portafolio de inversiones"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nombre descriptivo para identificar este activo.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de activo</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Clasifica tu activo para mejor organización.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Valor actual</Label>
                <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
                <p className="text-xs text-muted-foreground">
                  Valor estimado actual del activo en el mercado.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Moneda en la que está denominado el activo.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Rendimiento actual %</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={currentYield}
                    onChange={(e) => setCurrentYield(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Rentabilidad anual que genera el activo.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Símbolo (opcional)</Label>
                  <Input
                    placeholder="Ej. NU, AAPL, USDT"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ticker para consultar su valor en línea.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Fuente</Label>
                  <Select value={quoteSource} onValueChange={setQuoteSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yahoo">Yahoo (acciones)</SelectItem>
                      <SelectItem value="coingecko">CoinGecko (cripto)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Origen del precio al consultar.</p>
                </div>
              </div>
            </>
          )}
          {entityType === "liability" && (
            <>
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  placeholder="Ej. Tarjeta Visa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nombre descriptivo para identificar esta deuda.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de deuda</Label>
                <Select value={liabilityType} onValueChange={setLiabilityType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {liabilityTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Clasifica tu deuda para mejor organización.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Saldo actual</Label>
                  <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
                  <p className="text-xs text-muted-foreground">Saldo pendiente por pagar.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Tasa de interés %</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Porcentaje de interés anual que genera la deuda.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Moneda en la que está denominada la deuda.
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
