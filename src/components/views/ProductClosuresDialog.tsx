import { useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useProductClosures } from "@/lib/hooks/use-api";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { fmtPeriod } from "@/lib/format";
import { t } from "@/lib/i18n/errors";
import type { ProductClosure, ProductClosureStatus, ProductKind } from "@/lib/api/banking";
import { ReconcileDialog } from "./ReconcileDialog";

export interface ClosureProduct {
  kind: ProductKind;
  id: number;
  name: string;
}

const STATUS_META: Record<
  ProductClosureStatus,
  { label: string; tone: "warning" | "success" | "muted" }
> = {
  pending: { label: "Por conciliar", tone: "warning" },
  reconciled: { label: "Conciliado", tone: "success" },
  skipped: { label: "Omitido", tone: "muted" },
};

/** Historial de cierres de una cuenta o tarjeta, del más reciente al más antiguo. */
export function ProductClosuresDialog({
  product,
  onClose,
}: {
  product: ClosureProduct;
  onClose: () => void;
}) {
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useProductClosures({ product_kind: product.kind, product_id: product.id });
  const [reconciling, setReconciling] = useState<ProductClosure | null>(null);
  const closures = [...data].sort((a, b) => b.period_end.localeCompare(a.period_end));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cierres de {product.name}</DialogTitle>
          <DialogDescription>
            Cada cierre guarda el saldo que Sprig esperaba al final del periodo. Concílialo con tu
            saldo real o tu extracto.
          </DialogDescription>
        </DialogHeader>

        {(() => {
          if (isLoading) {
            return (
              <div className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando cierres" />
              </div>
            );
          }
          if (error) {
            return (
              <div className="space-y-3 py-4 text-center">
                <p role="alert" className="text-sm text-destructive">
                  {t("err.closure.load")}
                </p>
                <Button variant="outline" onClick={() => void refetch()}>
                  Reintentar
                </Button>
              </div>
            );
          }
          if (closures.length === 0) {
            return (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay cierres. Se crean al terminar cada mes o, en tarjetas con día de corte,
                ese día.
              </p>
            );
          }
          return (
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto" aria-label="Cierres">
              {closures.map((c) => (
                <ClosureItem key={c.id} closure={c} onReconcile={() => setReconciling(c)} />
              ))}
            </ul>
          );
        })()}

        {reconciling && (
          <ReconcileDialog
            closure={reconciling}
            productName={product.name}
            onClose={() => setReconciling(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClosureItem({
  closure: c,
  onReconcile,
}: {
  closure: ProductClosure;
  onReconcile: () => void;
}) {
  const fmt = useFormattedAmount();
  const money = (v: number) => fmt(v, { currency: c.currency });
  const meta = STATUS_META[c.status];

  return (
    <li className="rounded-xl border border-border bg-surface/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{fmtPeriod(c.period_start, c.period_end)}</p>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Esperado: <span className="tabular-nums">{money(c.expected_balance)}</span>
        {c.reported_balance != null && (
          <>
            {" · "}Real: <span className="tabular-nums">{money(c.reported_balance)}</span>
          </>
        )}
        {c.difference != null && (
          <>
            {" · "}Diferencia: <span className="tabular-nums">{money(c.difference)}</span>
          </>
        )}
      </p>
      {/* Volver a conciliar reemplaza el ajuste previo sin duplicarlo (R6.5). */}
      <Button size="sm" variant="outline" className="mt-2" onClick={onReconcile}>
        {c.status === "reconciled" ? "Volver a conciliar" : "Conciliar"}
      </Button>
    </li>
  );
}

/** Aviso en patrimonio con los cierres pendientes (R3.1). */
export function PendingClosuresNotice({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4"
    >
      <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div>
        <p className="text-sm font-semibold text-foreground">
          {count === 1 ? "1 cierre por conciliar" : `${count} cierres por conciliar`}
        </p>
        <p className="text-xs text-muted-foreground">
          Ábrelo desde «Cierres» en la cuenta o tarjeta para escribir el saldo real o subir el
          extracto.
        </p>
      </div>
    </div>
  );
}
