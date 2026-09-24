import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useUpdateTaxSummary, type TaxSummary } from "@/lib/hooks/use-api";

import { t } from "@/lib/i18n/errors";
interface TaxSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxSummary: TaxSummary | null;
}

export function TaxSummaryDialog({ open, onOpenChange, taxSummary }: TaxSummaryDialogProps) {
  const updateTaxSummary = useUpdateTaxSummary();

  const [totalIncome, setTotalIncome] = useState("");
  const [totalAssets, setTotalAssets] = useState("");
  const [totalLiabilities, setTotalLiabilities] = useState("");
  const [uvtValue, setUvtValue] = useState("");
  const [estimatedTax, setEstimatedTax] = useState("");
  const [mustDeclare, setMustDeclare] = useState(false);
  const [mustDeclareTouched, setMustDeclareTouched] = useState(false);

  useEffect(() => {
    if (!taxSummary) return;
    setTotalIncome(String(taxSummary.total_income ?? 0));
    setTotalAssets(String(taxSummary.total_assets ?? 0));
    setTotalLiabilities(String(taxSummary.total_liabilities ?? 0));
    setUvtValue(String(taxSummary.uvt_value ?? 0));
    setEstimatedTax(taxSummary.estimated_tax != null ? String(taxSummary.estimated_tax) : "");
    setMustDeclare(taxSummary.must_declare);
    setMustDeclareTouched(false);
  }, [taxSummary, open]);

  async function handleSubmit() {
    if (!taxSummary) return;

    const payload = {
      total_income: Number(totalIncome),
      total_assets: Number(totalAssets),
      total_liabilities: Number(totalLiabilities),
      uvt_value: Number(uvtValue),
      estimated_tax: estimatedTax ? Number(estimatedTax) : undefined,
      // Solo se envía si el usuario lo tocó explícitamente: de lo contrario el
      // backend recalcula must_declare con los umbrales DIAN sobre los nuevos montos.
      must_declare: mustDeclareTouched ? mustDeclare : undefined,
    };

    await updateTaxSummary.mutateAsync(
      { id: taxSummary.id, dto: payload },
      {
        onSuccess: () => {
          toast.success("Resumen fiscal actualizado");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(
            err instanceof Error && err.message
              ? err.message
              : t("err.tax.update"),
          ),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar resumen fiscal {taxSummary?.fiscal_year}</DialogTitle>
          <DialogDescription>
            Ajusta manualmente los valores calculados. La obligación de declarar se recalcula con
            los umbrales UVT vigentes según los montos que dejes aquí.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ingresos totales</Label>
              <CurrencyInput value={totalIncome} onChange={setTotalIncome} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Activos totales</Label>
              <CurrencyInput value={totalAssets} onChange={setTotalAssets} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pasivos totales</Label>
              <CurrencyInput
                value={totalLiabilities}
                onChange={setTotalLiabilities}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor UVT</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="Ej. 42680"
                value={uvtValue}
                onChange={(e) => setUvtValue(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Impuesto estimado (opcional)</Label>
            <CurrencyInput value={estimatedTax} onChange={setEstimatedTax} placeholder="0" />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="must-declare"
              checked={mustDeclare}
              onCheckedChange={(v) => {
                setMustDeclare(v === true);
                setMustDeclareTouched(true);
              }}
            />
            <Label htmlFor="must-declare" className="cursor-pointer">
              Debe declarar impuestos
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={updateTaxSummary.isPending}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              {updateTaxSummary.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
