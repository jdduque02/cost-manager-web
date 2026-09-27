import { useEffect, useState } from "react";
import { AlertTriangle, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useProductClosure,
  useReconcileProductClosure,
  useSkipProductClosure,
  useStatementImportJob,
} from "@/lib/hooks/use-api";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { fmtPeriod } from "@/lib/format";
import { errorText, t } from "@/lib/i18n/errors";
import type { ProductClosure } from "@/lib/api/banking";
import type { StatementImport } from "@/lib/api/statement-imports";
import { StatementImportDialog } from "./StatementImportDialog";

interface ReconcileDialogProps {
  closure: ProductClosure;
  productName: string;
  onClose: () => void;
}

const TERMINAL = new Set(["completed", "partial", "failed"]);

/** Saldo final del extracto más reciente que lo trae (en tarjetas llega null). */
function suggestedBalance(job: StatementImport): number | null {
  const withBalance = (job.files ?? [])
    .filter((f) => f.status === "success" && f.closing_balance != null)
    .sort((a, b) => (b.period_to ?? "").localeCompare(a.period_to ?? ""));
  return withBalance[0]?.closing_balance ?? null;
}

/** true si algún archivo trae periodo y no se cruza con el del cierre. */
function periodMismatch(job: StatementImport, closure: ProductClosure): boolean {
  return (job.files ?? []).some(
    (f) =>
      !!f.period_from &&
      !!f.period_to &&
      (f.period_to < closure.period_start || f.period_from > closure.period_end),
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function ReconcileDialog({ closure: initial, productName, onClose }: ReconcileDialogProps) {
  // El detalle recalcula el saldo esperado (p. ej. tras importar un extracto).
  const { data: fresh, refetch } = useProductClosure(initial.id);
  const closure = fresh ?? initial;
  const reconcile = useReconcileProductClosure();
  const skip = useSkipProductClosure();
  const fmt = useFormattedAmount();
  const money = (v: number) => fmt(v, { currency: closure.currency });
  const isCard = closure.product_kind === "liability";

  const [tab, setTab] = useState("write");
  const [reported, setReported] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [totalPayment, setTotalPayment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const { data: job } = useStatementImportJob(jobId);

  const jobDone = !!job && TERMINAL.has(job.status);
  const jobFailed = jobDone && job.status === "failed";
  const suggestion = jobDone && !jobFailed ? suggestedBalance(job) : null;
  const mismatch = jobDone && !jobFailed && periodMismatch(job, closure);

  useEffect(() => {
    if (!jobDone || jobFailed) return;
    void refetch();
    if (suggestion != null) setReported(String(suggestion));
    // Solo al terminar el lote: no pisar lo que el usuario escriba después.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobDone, jobFailed, job?.id]);

  const reportedNum = reported ? Number(reported) : null;
  // Solo vista previa: la diferencia que vale es la que devuelve el POST.
  const preview = reportedNum == null ? null : round2(reportedNum - closure.expected_balance);
  const busy = reconcile.isPending || skip.isPending;

  function handleReconcile(e: React.FormEvent) {
    e.preventDefault();
    if (reportedNum == null) return;
    setError(null);
    reconcile.mutate(
      {
        id: closure.id,
        dto: {
          reported_balance: reportedNum,
          ...(isCard && minimumPayment && { minimum_payment: Number(minimumPayment) }),
          ...(isCard && totalPayment && { total_payment: Number(totalPayment) }),
        },
      },
      {
        onSuccess: (c) => {
          toast.success(
            c.difference
              ? `Cierre conciliado. Quedó un movimiento por ${money(Math.abs(c.difference))} para clasificar.`
              : "Cierre conciliado sin diferencias.",
          );
          onClose();
        },
        onError: (err) => setError(errorText(err, "err.closure.reconcile")),
      },
    );
  }

  function handleSkip() {
    setError(null);
    skip.mutate(closure.id, {
      onSuccess: () => {
        toast.success("Cierre omitido. Puedes conciliarlo después.");
        onClose();
      },
      onError: (err) => setError(errorText(err, "err.closure.skip")),
    });
  }

  const balanceLabel = isCard ? "Deuda real según el banco" : "Saldo real de la cuenta";
  const expectedLabel = isCard ? "Deuda esperada en Sprig" : "Saldo esperado en Sprig";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conciliar {productName}</DialogTitle>
          <DialogDescription>
            Periodo {fmtPeriod(closure.period_start, closure.period_end)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReconcile} className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-surface p-3">
            <span className="text-sm text-muted-foreground">{expectedLabel}</span>
            <span className="font-display text-base font-semibold tabular-nums">
              {money(closure.expected_balance)}
            </span>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="write" className="flex-1">
                Escribir saldo
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">
                Subir extracto
              </TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reconcile-reported">{balanceLabel}</Label>
                <CurrencyInput
                  id="reconcile-reported"
                  value={reported}
                  onChange={setReported}
                  placeholder="0"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {isCard
                    ? "Lo que le debes al banco al corte, según tu app o extracto."
                    : "Lo que tenías en la cuenta al cierre, según tu banco."}
                </p>
              </div>
              {isCard && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reconcile-minimum">Pago mínimo</Label>
                    <CurrencyInput
                      id="reconcile-minimum"
                      value={minimumPayment}
                      onChange={setMinimumPayment}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reconcile-total">Pago total</Label>
                    <CurrencyInput
                      id="reconcile-total"
                      value={totalPayment}
                      onChange={setTotalPayment}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-3">
              <UploadTab
                job={job}
                jobId={jobId}
                jobFailed={jobFailed}
                suggestion={suggestion}
                remaining={preview}
                money={money}
                onUpload={() => {
                  setJobId(null);
                  setImportOpen(true);
                }}
                onGoWrite={() => setTab("write")}
              />
            </TabsContent>
          </Tabs>

          {preview != null && (
            <p className="rounded-xl bg-surface p-3 text-sm" aria-live="polite">
              {preview === 0 ? (
                "Sin diferencia: el cierre queda conciliado sin crear movimientos."
              ) : (
                <>
                  Diferencia (real − esperado):{" "}
                  <span className="font-semibold tabular-nums">{money(preview)}</span>. Se
                  registrará un movimiento pendiente por {money(Math.abs(preview))} para que lo
                  clasifiques.
                </>
              )}
            </p>
          )}

          {mismatch && (
            <p
              role="status"
              className="flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              El periodo del extracto no se cruza con el del cierre (
              {fmtPeriod(closure.period_start, closure.period_end)}). Revisa que sea el extracto
              correcto antes de conciliar.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            {closure.status === "pending" && (
              <Button type="button" variant="outline" onClick={handleSkip} disabled={busy}>
                {skip.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Omitir
              </Button>
            )}
            <Button
              type="submit"
              disabled={busy || reportedNum == null}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              {reconcile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Conciliar
            </Button>
          </DialogFooter>
        </form>

        <StatementImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          presetAccountId={isCard ? undefined : closure.product_id}
          presetLiabilityId={isCard ? closure.product_id : undefined}
          onCompleted={(id) => {
            setJobId(id);
            setImportOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function UploadTab({
  job,
  jobId,
  jobFailed,
  suggestion,
  remaining,
  money,
  onUpload,
  onGoWrite,
}: {
  job: StatementImport | undefined;
  jobId: number | null;
  jobFailed: boolean;
  suggestion: number | null;
  remaining: number | null;
  money: (v: number) => string;
  onUpload: () => void;
  onGoWrite: () => void;
}) {
  const uploadButton = (label: string) => (
    <Button type="button" variant="outline" onClick={onUpload} className="w-full">
      <FileUp className="h-4 w-4" />
      {label}
    </Button>
  );

  if (jobId == null) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          Sube el PDF del extracto: creamos los movimientos que falten (sin duplicar los que ya
          tienes) y te proponemos el saldo final si el extracto lo trae.
        </p>
        {uploadButton("Subir extracto PDF")}
      </>
    );
  }

  if (!job || !TERMINAL.has(job.status)) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" /> Procesando el extracto…
      </p>
    );
  }

  if (jobFailed) {
    const detail = job.files?.find((f) => f.error_message)?.error_message;
    return (
      <>
        <div role="alert" className="space-y-1 text-sm text-destructive">
          <p>{t("err.closure.import")}</p>
          {detail && <p>{detail}</p>}
        </div>
        {uploadButton("Intentar con otro extracto")}
      </>
    );
  }

  return (
    <>
      <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 text-center text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Nuevos</dt>
          <dd className="font-semibold tabular-nums">{job.total_records_created}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Omitidos (duplicados)</dt>
          <dd className="font-semibold tabular-nums">{job.total_records_skipped}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Diferencia restante</dt>
          <dd className="font-semibold tabular-nums">
            {remaining == null ? "—" : money(remaining)}
          </dd>
        </div>
      </dl>
      {suggestion != null ? (
        <p className="text-sm">
          Saldo final del extracto: <span className="font-semibold">{money(suggestion)}</span>. Lo
          dejamos como saldo real; revísalo y confirma.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Este extracto no trae el saldo final. Escríbelo para terminar la conciliación.
          </p>
          <Button type="button" variant="outline" onClick={onGoWrite} className="w-full">
            Escribir saldo
          </Button>
        </div>
      )}
    </>
  );
}
