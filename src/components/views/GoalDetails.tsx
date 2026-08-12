import { useMemo } from "react";
import { Calendar, Landmark, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { useGoalTransactions } from "@/lib/hooks/use-api";
import type { FinancialObjective } from "@/lib/api/finance";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "d MMM yyyy", { locale: es });
  } catch {
    return "—";
  }
}

function estimateProjectedBalance(g: FinancialObjective): number | null {
  const rate = g.current_profitability ?? g.interest_rate ?? null;
  if (rate == null || rate <= 0) return null;
  if (!g.start_date || !g.end_date) return null;
  const months = Math.max(
    1,
    Math.round(
      (new Date(g.end_date).getTime() - new Date(g.start_date).getTime()) /
        (1000 * 60 * 60 * 24 * 30),
    ),
  );
  const monthlyRate = rate / 100 / 12;
  const p = g.current_balance ?? 0;
  const q = g.monthly_payment ?? Math.max(0, (g.target_amount - p) / Math.max(months, 1));
  return (
    Math.round(
      (p * Math.pow(1 + monthlyRate, months) +
        q * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)) *
        100,
    ) / 100
  );
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "semanal",
  biweekly: "quincenal",
  monthly: "mensual",
  quarterly: "trimestral",
  yearly: "anual",
};

export function GoalDetails({ goal }: { goal: FinancialObjective }) {
  const fmtAmount = useFormattedAmount();
  const { data: transactions = [], isLoading } = useGoalTransactions(goal.id);

  const contributed = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "income" || t.type === "investment")
        .reduce((s, t) => s + Number(t.amount ?? 0), 0),
    [transactions],
  );

  const projected = useMemo(() => estimateProjectedBalance(goal), [goal]);
  const rate = goal.current_profitability ?? goal.interest_rate ?? null;
  const pct = Math.min((goal.current_balance / (goal.target_amount || 1)) * 100, 100);

  return (
    <div className="mt-5 space-y-4 border-t border-border/60 pt-4">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xs text-muted-foreground">Aportado</p>
          <p className="mt-0.5 font-semibold tabular-nums">{fmtAmount(contributed)}</p>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xs text-muted-foreground">Saldo actual</p>
          <p className="mt-0.5 font-semibold tabular-nums">{fmtAmount(goal.current_balance)}</p>
        </div>
        {projected != null ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Proyección</p>
            <p className="mt-0.5 flex items-center gap-1 font-semibold tabular-nums text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              {fmtAmount(projected)}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-muted-foreground">Meta final</p>
            <p className="mt-0.5 font-semibold tabular-nums">{fmtAmount(goal.target_amount)}</p>
          </div>
        )}
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xs text-muted-foreground">% completada</p>
          <p className="mt-0.5 font-semibold tabular-nums">{Math.round(pct)}%</p>
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
          <span>
            {formatDate(goal.start_date)} → {formatDate(goal.end_date)}
            {goal.frequency && ` · ${FREQUENCY_LABELS[goal.frequency] ?? goal.frequency}`}
          </span>
        </div>
        {goal.bank && (
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 shrink-0 text-primary/70" />
            <span>
              Cuenta vinculada: {goal.bank}
              {rate != null ? ` · ${rate}% anual` : ""}
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Transacciones ({transactions.length})
        </p>
        {isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground/70">Cargando…</p>
        ) : transactions.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground/70">
            Sin transacciones vinculadas a esta meta.
          </p>
        ) : (
          <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  {t.type === "income" ? (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-success" />
                  ) : t.type === "investment" ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-destructive" />
                  )}
                  <span className="truncate text-muted-foreground">
                    {t.description || "Sin descripción"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-muted-foreground/70">
                    {formatDate(t.transaction_date)}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      t.type === "income"
                        ? "text-success"
                        : t.type === "investment"
                          ? "text-primary"
                          : "text-destructive",
                    )}
                  >
                    {t.type === "income" || t.type === "investment" ? "+" : "-"}
                    {fmtAmount(t.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-surface p-3 text-xs text-muted-foreground">
        <Wallet className="h-4 w-4 shrink-0 text-primary/70" />
        <span>
          {rate != null && rate > 0
            ? `Con una tasa anual del ${rate}%, el interés compuesto proyecta ${fmtAmount(
                projected ?? 0,
              )} al final del plazo.`
            : "Vincula una cuenta o define una tasa anual para proyectar el interés compuesto."}
        </span>
      </div>
    </div>
  );
}
