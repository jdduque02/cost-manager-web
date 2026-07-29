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
}

const accountTypes: { value: AccountType; label: string }[] = [
  { value: "ahorros", label: "Ahorros" },
  { value: "corriente", label: "Corriente" },
  { value: "inversion", label: "Inversión" },
  { value: "otro", label: "Otro" },
];

const assetTypes: { value: AssetType; label: string }[] = [
  { value: "acciones", label: "Acciones" },
  { value: "bienes_raices", label: "Bienes raíces" },
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

const entityLabels: Record<EntityType, { create: string; edit: string; title: string }> = {
  account: { create: "Nueva Cuenta", edit: "Editar Cuenta", title: "Cuenta bancaria" },
  asset: { create: "Nuevo Activo", edit: "Editar Activo", title: "Activo financiero" },
  liability: { create: "Nueva Deuda", edit: "Editar Deuda", title: "Pasivo financiero" },
};

export function WealthDialog({ open, onOpenChange, entityType, entity }: WealthDialogProps) {
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
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (entity) {
      if (entityType === "account") {
        const a = entity as BankAccount;
        setBankName(a.bank_name);
        setAccountType(a.account_type);
        setAccountNumber("");
        setAmount(String(Number(a.display_balance ?? 0)));
        setIsPrimary(a.is_primary);
      } else if (entityType === "asset") {
        const a = entity as FinancialAsset;
        setName(a.name);
        setAssetType(a.asset_type);
        setAmount(String(a.current_value));
      } else {
        const l = entity as FinancialLiability;
        setName(l.name);
        setLiabilityType(l.liability_type);
        setAmount(String(l.current_balance));
        setInterestRate(String(l.interest_rate ?? ""));
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
    setIsPrimary(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (entityType === "account") {
      const dto = {
        bank_name: bankName,
        account_type: accountType as AccountType,
        account_number: accountNumber || "0000",
        balance: Number(amount) || 0,
        is_primary: isPrimary,
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
          onSuccess: () => {
            toast.success("Cuenta creada");
            reset();
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
          onSuccess: () => {
            toast.success("Activo creado");
            reset();
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
          onSuccess: () => {
            toast.success("Deuda creada");
            reset();
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
              </div>
              <div className="space-y-1.5">
                <Label>Número de cuenta</Label>
                <Input
                  placeholder="Opcional"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Saldo</Label>
                <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
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
              </div>
              <div className="space-y-1.5">
                <Label>Valor actual</Label>
                <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Saldo actual</Label>
                  <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
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
                </div>
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
