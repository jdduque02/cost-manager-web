import { useState } from "react";
import { Card } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExchangeRate } from "@/lib/hooks/use-api";
import { fmtCurrency } from "@/lib/format";
import { RefreshCw, Loader2, ArrowLeftRight } from "lucide-react";

type Direction = "cop_usd" | "usd_cop";

export function CurrencyConverter({ className }: { className?: string }) {
  const { data, isLoading, isError, refetch } = useExchangeRate();
  const [direction, setDirection] = useState<Direction>("cop_usd");
  const [amount, setAmount] = useState("");
  const [manualRate, setManualRate] = useState("");

  const liveRate = data?.cop_per_usd;
  const rate = manualRate ? Number(manualRate) : liveRate;
  const parsed = Number(amount);
  const hasRate = typeof rate === "number" && !isNaN(rate) && rate > 0;
  const result =
    hasRate && !isNaN(parsed) && parsed > 0
      ? direction === "cop_usd"
        ? parsed / rate
        : parsed * rate
      : null;

  const inputCurrency = direction === "cop_usd" ? "COP" : "USD";
  const outputCurrency = direction === "cop_usd" ? "USD" : "COP";

  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Conversor COP ⇄ USD</h3>
        <button
          onClick={() => refetch()}
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          title="Actualizar tasa"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="text-muted-foreground">Tasa USD/COP:</span>
        {hasRate ? (
          <span className="font-mono font-medium text-primary tabular-nums">
            1 USD = {fmtCurrency(rate, "COP")}
          </span>
        ) : isLoading ? (
          <span className="text-muted-foreground">Consultando tasa…</span>
        ) : (
          <span className="text-destructive">No disponible</span>
        )}
        {data?.source && (
          <span className="text-muted-foreground/60">
            · {data.source}
            {data.updated_at ? ` · ${new Date(data.updated_at).toLocaleDateString("es-CO")}` : ""}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Monto en {inputCurrency}</Label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Dirección</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cop_usd">COP → USD</SelectItem>
              <SelectItem value="usd_cop">USD → COP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <Label className="text-xs">Tasa manual (opcional, sobreescribe la consultada)</Label>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder={liveRate ? String(liveRate) : "Ej. 4100"}
          value={manualRate}
          onChange={(e) => setManualRate(e.target.value)}
        />
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-surface/60 p-3">
        <p className="text-xs text-muted-foreground">
          {result ? (
            <>
              <span className="font-medium text-foreground">
                {parsed} {inputCurrency}
              </span>{" "}
              ={" "}
            </>
          ) : (
            <span>Ingresa un monto para ver la conversión</span>
          )}
        </p>
        {result != null && (
          <p className="font-display text-lg font-semibold tabular-nums text-primary">
            {fmtCurrency(result, outputCurrency)}
          </p>
        )}
        {!result && amount && (
          <p className="text-xs text-destructive">Revisa el monto o la tasa.</p>
        )}
      </div>

      {isError && (
        <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          No se pudo consultar la tasa automática; usa la tasa manual.
        </p>
      )}
    </Card>
  );
}
