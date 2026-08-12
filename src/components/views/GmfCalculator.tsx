import { useState } from "react";
import { Card } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtCurrency } from "@/lib/format";
import { Landmark, Info } from "lucide-react";

const GMF_RATE = 0.004;

export function GmfCalculator({ className }: { className?: string }) {
  const [amount, setAmount] = useState("");
  const [monthlyCount, setMonthlyCount] = useState("1");

  const parsed = Number(amount);
  const count = Math.max(0, Number(monthlyCount) || 0);
  const hasAmount = !isNaN(parsed) && parsed > 0;

  const perTransaction = hasAmount ? parsed * GMF_RATE : 0;
  const monthly = perTransaction * count;
  const yearly = monthly * 12;

  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Calculadora 4x1000</h3>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
          <Landmark className="h-4 w-4 text-destructive" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Monto de cada movimiento</Label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="Ej. 500000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Movimientos al mes</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="1"
            value={monthlyCount}
            onChange={(e) => setMonthlyCount(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-border/60 bg-surface/60 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Impuesto por movimiento</span>
          <span className="font-medium tabular-nums text-destructive">
            {hasAmount ? fmtCurrency(perTransaction) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Al mes ({count} movimientos)</span>
          <span className="font-medium tabular-nums text-destructive">
            {hasAmount ? fmtCurrency(monthly) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm">
          <span className="text-muted-foreground">Al año</span>
          <span className="font-display text-base font-semibold tabular-nums text-destructive">
            {hasAmount ? fmtCurrency(yearly) : "—"}
          </span>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        El GMF cobra 0.4% (4 por mil) por cada débito. Una sola cuenta por persona puede estar
        exenta; márcala como "Exenta 4x1000" en Patrimonio.
      </p>
    </Card>
  );
}
