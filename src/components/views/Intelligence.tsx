import { Card, Badge } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormattedAmount, useAmountsHidden } from "@/lib/hooks/use-formatted-amount";
import { MASKED } from "@/lib/format";
import { FileText, Sparkles, ShieldCheck, Loader2, Brain, Download, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useFinancialBudgetProfile,
  useTransactionSummary,
  useTaxSummary,
  useCalculateTaxSummary,
  useFinancialAiAnalysis,
  useDownloadFinancialAiReport,
} from "@/lib/hooks/use-api";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { FinancialEducation } from "./FinancialEducation";
import { LifeStageGuide } from "./LifeStageGuide";
import { TaxSummaryDialog } from "./TaxSummaryDialog";

import { t } from "@/lib/i18n/errors";
function BudgetBar({
  name,
  actual,
  limit,
  tone,
  fmtAmount,
}: {
  name: string;
  actual: number;
  limit: number;
  tone: string;
  fmtAmount: (v: number) => string;
}) {
  const pct = Math.min((actual / limit) * 100, 130);
  const over = actual > limit;
  const colorClass: Record<string, string> = {
    primary: "bg-primary",
    destructive: "bg-destructive",
    warning: "bg-warning",
  };
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="tabular-nums text-muted-foreground">
          {fmtAmount(actual)} <span className="text-muted-foreground/60">/ {fmtAmount(limit)}</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            colorClass[tone],
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs">
        <span className="text-muted-foreground">{Math.round((actual / limit) * 100)}% usado</span>
        {over ? (
          <Badge tone="destructive">Sobre presupuesto</Badge>
        ) : (
          <Badge tone="success">En camino</Badge>
        )}
      </div>
    </div>
  );
}

export function Intelligence() {
  const { data: profile, isLoading: loadProfile } = useFinancialBudgetProfile();
  const monthQuery = useMemo(() => {
    const now = new Date();
    return {
      date_from: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"),
      date_to: format(now, "yyyy-MM-dd"),
    };
  }, []);
  // Totales del mes agregados en servidor (el listado paginado los truncaba).
  const { data: monthSummary, isLoading: loadTxs } = useTransactionSummary(monthQuery);
  const { data: taxSummary, isLoading: loadTax } = useTaxSummary();
  const {
    data: aiAnalysis,
    isLoading: loadAiAnalysis,
    isError: isAiAnalysisError,
  } = useFinancialAiAnalysis();
  const downloadReport = useDownloadFinancialAiReport();
  const calculateTaxSummary = useCalculateTaxSummary();
  const fmtAmount = useFormattedAmount();
  const amountsHidden = useAmountsHidden();
  const fmtUvt = (n?: number | null) => {
    if (amountsHidden) return MASKED;
    return n ? Math.round(n).toLocaleString() : "N/A";
  };
  const [taxSummaryDialogOpen, setTaxSummaryDialogOpen] = useState(false);

  const isLoading = loadProfile || loadTxs || loadTax;

  const handleTaxSummaryAction = () => {
    if (!taxSummary) {
      calculateTaxSummary.mutate(undefined, {
        onSuccess: () => toast.success("Resumen fiscal calculado"),
        onError: (err) =>
          toast.error(
            err instanceof Error && err.message
              ? err.message
              : t("err.tax.calc"),
          ),
      });
      return;
    }
    setTaxSummaryDialogOpen(true);
  };

  const handleDownloadReport = () => {
    downloadReport.mutate(undefined, {
      onError: () => {
        toast.error(t("err.report.download"), {
          description: t("err.retry.seconds"),
        });
      },
    });
  };

  const budgetData = useMemo(() => {
    if (!profile) return null;

    const monthlyIncome = monthSummary?.totals.income ?? 0;
    const monthlyExpenses = monthSummary?.totals.expenses ?? 0;

    const needsLimit = monthlyIncome * (profile.needs_ratio / 100);
    const wantsLimit = monthlyIncome * (profile.wants_ratio / 100);
    const savingsLimit = monthlyIncome * (profile.savings_ratio / 100);

    // Simple split: 60% of expenses are needs, 40% are wants
    const needsActual = monthlyExpenses * 0.6;
    const wantsActual = monthlyExpenses * 0.4;
    const savingsActual = monthlyIncome - monthlyExpenses;

    return [
      {
        name: `Necesidades (${profile.needs_ratio}%)`,
        actual: needsActual,
        limit: needsLimit,
        tone: "primary",
      },
      {
        name: `Deseos (${profile.wants_ratio}%)`,
        actual: wantsActual,
        limit: wantsLimit,
        tone: "destructive",
      },
      {
        name: `Ahorros (${profile.savings_ratio}%)`,
        actual: savingsActual,
        limit: savingsLimit,
        tone: "warning",
      },
    ];
  }, [profile, monthSummary]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Inteligencia e Impuestos</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Presupuesto inteligente y proyecciones
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Información orientativa calculada con los datos que registras. No constituye asesoría
          financiera ni tributaria.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Regla 50 / 30 / 20</h3>
              <p className="text-sm text-muted-foreground">Tu asignacion ideal vs. gasto real</p>
            </div>
            <Badge tone="primary">
              <Sparkles className="h-3 w-3" /> Referencia
            </Badge>
          </div>
          <div className="mt-6 space-y-6">
            {budgetData ? (
              budgetData.map((b) => <BudgetBar key={b.name} {...b} fmtAmount={fmtAmount} />)
            ) : (
              <p className="text-sm text-muted-foreground">
                Configura tu perfil financiero para ver el desglose 50/30/20.
              </p>
            )}
          </div>
        </Card>

        <Card glow className="relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <Badge tone="primary">DIAN - Colombia</Badge>
              <h3 className="mt-1 font-display text-lg font-semibold">
                Proyeccion de Impuestos {taxSummary?.fiscal_year ?? 2026}
              </h3>
            </div>
          </div>

          <dl className="mt-6 space-y-4">
            <div className="flex items-end justify-between border-b border-border pb-3">
              <dt className="text-sm text-muted-foreground">Patrimonio Neto (UVT)</dt>
              <dd className="text-right">
                <p className="font-display text-lg font-semibold">
                  {fmtUvt(taxSummary?.assets_in_uvt)} UVT
                </p>
                <p className="text-xs text-muted-foreground">
                  {taxSummary?.patrimony ? fmtAmount(taxSummary.patrimony) : "N/A"}
                </p>
              </dd>
            </div>
            <div className="flex items-end justify-between border-b border-border pb-3">
              <dt className="text-sm text-muted-foreground">Ingreso Anual (UVT)</dt>
              <dd className="text-right">
                <p className="font-display text-lg font-semibold">
                  {fmtUvt(taxSummary?.income_in_uvt)} UVT
                </p>
                <p className="text-xs text-muted-foreground">
                  {taxSummary?.total_income ? fmtAmount(taxSummary.total_income) : "N/A"}
                </p>
              </dd>
            </div>
            <div className="flex items-end justify-between">
              <dt className="text-sm text-muted-foreground">Obligacion de declaracion</dt>
              <dd>
                {taxSummary?.must_declare ? (
                  <Badge tone="warning">Requerida</Badge>
                ) : (
                  <Badge tone="success">No requerida</Badge>
                )}
              </dd>
            </div>
          </dl>

          <button
            onClick={handleTaxSummaryAction}
            disabled={calculateTaxSummary.isPending}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm font-medium hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {calculateTaxSummary.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : taxSummary ? (
              <Pencil className="h-4 w-4 text-primary" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-primary" />
            )}
            {taxSummary ? "Editar resumen fiscal" : "Calcular resumen fiscal"}
          </button>
        </Card>
      </div>

      <TaxSummaryDialog
        open={taxSummaryDialogOpen}
        onOpenChange={setTaxSummaryDialogOpen}
        taxSummary={taxSummary ?? null}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Análisis con IA</h3>
              <p className="text-sm text-muted-foreground">
                Narrativa y recomendaciones generadas a partir de tu resumen financiero
              </p>
            </div>
          </div>
          {aiAnalysis && (
            <Badge tone="primary">
              <Sparkles className="h-3 w-3" /> {aiAnalysis.provider}
            </Badge>
          )}
        </div>

        <div className="mt-5">
          {loadAiAnalysis ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : isAiAnalysisError || !aiAnalysis ? (
            <p className="text-sm text-muted-foreground">
              No fue posible cargar el análisis con IA en este momento.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-foreground">{aiAnalysis.narrative}</p>

              {aiAnalysis.recommendations.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {aiAnalysis.recommendations.map((rec, idx) => (
                    <li
                      key={`${idx}-${rec.slice(0, 24)}`}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Generado el {new Date(aiAnalysis.generated_at).toLocaleDateString("es-CO")}
              </p>
            </>
          )}

          <button
            onClick={handleDownloadReport}
            disabled={downloadReport.isPending}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm font-medium hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloadReport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-primary" />
            )}
            Descargar reporte PDF
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg font-semibold">Recomendaciones de IA</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "Oportunidad de refinanciacion",
              d: "Refinanciar tu prestamo de auto podria ahorrarte ~$1,240/anio con las tasas actuales.",
            },
            {
              t: "Ahorro redondeado",
              d: "Activa los redondeos para invertir spare change. Estimado +$38/mes a tu portafolio.",
            },
            {
              t: "Auditoria de suscripciones",
              d: "3 suscripciones sin usar por 60+ dias. Cancela para recuperar $42/mes.",
            },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-border bg-surface/40 p-4">
              <Badge tone="primary">
                <Sparkles className="h-3 w-3" /> Insight
              </Badge>
              <p className="mt-3 font-medium">{x.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
            </div>
          ))}
        </div>
      </Card>

      <FinancialEducation />

      <LifeStageGuide />
    </div>
  );
}
