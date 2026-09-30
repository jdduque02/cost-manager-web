import { api } from "./client";
import type { PaymentMethod } from "./finance";

/** Estados financieros personales: `GET users/:userId/intelligence/statements/*`. */

/** `year` y `month` van juntos (el API responde 400 si llega uno solo). */
export interface StatementPeriod {
  year: number;
  month: number;
}

export interface StatementTotals {
  income: number;
  expenses: number;
  investments: number;
  net: number;
}

export interface StatementVariance {
  change: number;
  /** `null` si la base de comparación es 0. */
  change_pct: number | null;
}

export interface IncomeComparison extends StatementTotals {
  variance: Record<keyof StatementTotals, StatementVariance>;
}

export interface IncomeCategoryLine {
  /** `null` = "Sin clasificar". */
  category_id: number | null;
  expenses: number;
  previous_expenses: number;
  change_pct: number | null;
  share_pct: number | null;
  is_relevant: boolean;
}

export interface IncomeShare {
  amount: number;
  share_pct: number | null;
}

export interface IncomeCurrencyStatement extends StatementTotals {
  currency: string;
  compare: { previous_month: IncomeComparison; same_month_last_year: IncomeComparison };
  by_category: IncomeCategoryLine[];
  fixed: IncomeShare;
  variable: IncomeShare;
  /** `payment_method: null` = "Sin método". */
  by_payment_method: { payment_method: string | null; amount: number }[];
  reconciliation_adjustments: number;
}

export interface IncomeStatement {
  period: StatementPeriod;
  by_currency: IncomeCurrencyStatement[];
}

export interface BalanceCurrencyStatement {
  currency: string;
  assets: { liquid: number; investable: number; illiquid: number; total: number };
  liabilities: { short_term: number; long_term: number; total: number };
  net_worth: number;
}

export interface CreditCardLine {
  liability_id: number;
  name: string;
  currency: string;
  balance: number;
  credit_limit: number | null;
  available: number | null;
  utilization_pct: number | null;
  is_high: boolean;
}

export interface NetWorthEvolutionPoint {
  /** `YYYY-MM` */
  period_end: string;
  currency: string;
  net: number;
}

export interface BalanceSheet {
  as_of: string;
  by_currency: BalanceCurrencyStatement[];
  credit_cards: CreditCardLine[];
  /** Solo cuentas y pasivos: los activos no tienen historial. */
  evolution: { includes_assets: false; points: NetWorthEvolutionPoint[] };
}

export interface CashFlowCurrencyStatement {
  currency: string;
  operating: number;
  investing: number;
  debt: number;
  free: number;
}

export interface UpcomingFixedLine {
  transaction_id: number;
  description: string | null;
  amount: number;
  currency: string;
  type: string;
  due_date: string | null;
}

export interface CashFlowStatement {
  period: StatementPeriod;
  by_currency: CashFlowCurrencyStatement[];
  /** Siempre a hoy (próximos 30 días), aunque el periodo sea pasado. */
  upcoming_fixed: UpcomingFixedLine[];
}

export interface HealthCurrencyIndicators {
  currency: string;
  liquidity_ratio: number | null;
  cushion_months: number | null;
  /** % anual */
  avg_debt_rate_pct: number | null;
  /** % anual */
  avg_yield_pct: number | null;
  leverage_pct: number | null;
}

export interface FinancialHealth {
  period: StatementPeriod;
  /** Cuotas de deuda / ingreso del periodo, solo COP. */
  debt_payment_to_income_pct: number | null;
  leakage_12m: { currency: string; amount: number }[];
  /** Siempre a hoy, aunque el periodo sea pasado. */
  by_currency: HealthCurrencyIndicators[];
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Transferencia",
  cash: "Efectivo",
  debit_card: "Tarjeta débito",
  credit_card: "Tarjeta crédito",
  digital_wallet: "Billetera digital",
  mobile_payment: "Pago móvil",
  check: "Cheque",
  crypto: "Cripto",
};

export function paymentMethodLabel(method: string | null): string {
  if (method == null) return "Sin método";
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method.replace(/_/g, " ");
}

// El `numeric` de Postgres puede llegar como string: se convierte sin inventar ceros.
const n = (v: unknown): number => Number(v ?? 0);
const nOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

function totals<T extends StatementTotals>(t: T): T {
  return {
    ...t,
    income: n(t.income),
    expenses: n(t.expenses),
    investments: n(t.investments),
    net: n(t.net),
  };
}

function comparison(c: IncomeComparison): IncomeComparison {
  const variance = Object.fromEntries(
    Object.entries(c.variance ?? {}).map(([k, v]) => [
      k,
      { change: n(v.change), change_pct: nOrNull(v.change_pct) },
    ]),
  ) as IncomeComparison["variance"];
  return { ...totals(c), variance };
}

function normalizeIncome(s: IncomeStatement): IncomeStatement {
  return {
    ...s,
    by_currency: (s.by_currency ?? []).map((c) => ({
      ...totals(c),
      compare: {
        previous_month: comparison(c.compare.previous_month),
        same_month_last_year: comparison(c.compare.same_month_last_year),
      },
      by_category: (c.by_category ?? []).map((l) => ({
        ...l,
        expenses: n(l.expenses),
        previous_expenses: n(l.previous_expenses),
        change_pct: nOrNull(l.change_pct),
        share_pct: nOrNull(l.share_pct),
      })),
      fixed: { amount: n(c.fixed?.amount), share_pct: nOrNull(c.fixed?.share_pct) },
      variable: { amount: n(c.variable?.amount), share_pct: nOrNull(c.variable?.share_pct) },
      by_payment_method: (c.by_payment_method ?? []).map((p) => ({ ...p, amount: n(p.amount) })),
      reconciliation_adjustments: n(c.reconciliation_adjustments),
    })),
  };
}

function normalizeBalance(b: BalanceSheet): BalanceSheet {
  return {
    ...b,
    by_currency: (b.by_currency ?? []).map((c) => ({
      currency: c.currency,
      assets: {
        liquid: n(c.assets.liquid),
        investable: n(c.assets.investable),
        illiquid: n(c.assets.illiquid),
        total: n(c.assets.total),
      },
      liabilities: {
        short_term: n(c.liabilities.short_term),
        long_term: n(c.liabilities.long_term),
        total: n(c.liabilities.total),
      },
      net_worth: n(c.net_worth),
    })),
    credit_cards: (b.credit_cards ?? []).map((cc) => ({
      ...cc,
      balance: n(cc.balance),
      credit_limit: nOrNull(cc.credit_limit),
      available: nOrNull(cc.available),
      utilization_pct: nOrNull(cc.utilization_pct),
    })),
    evolution: {
      includes_assets: false,
      points: (b.evolution?.points ?? []).map((p) => ({ ...p, net: n(p.net) })),
    },
  };
}

function normalizeCashFlow(s: CashFlowStatement): CashFlowStatement {
  return {
    ...s,
    by_currency: (s.by_currency ?? []).map((c) => ({
      currency: c.currency,
      operating: n(c.operating),
      investing: n(c.investing),
      debt: n(c.debt),
      free: n(c.free),
    })),
    upcoming_fixed: (s.upcoming_fixed ?? []).map((f) => ({ ...f, amount: n(f.amount) })),
  };
}

function normalizeHealth(h: FinancialHealth): FinancialHealth {
  return {
    ...h,
    debt_payment_to_income_pct: nOrNull(h.debt_payment_to_income_pct),
    leakage_12m: (h.leakage_12m ?? []).map((l) => ({ ...l, amount: n(l.amount) })),
    by_currency: (h.by_currency ?? []).map((c) => ({
      currency: c.currency,
      liquidity_ratio: nOrNull(c.liquidity_ratio),
      cushion_months: nOrNull(c.cushion_months),
      avg_debt_rate_pct: nOrNull(c.avg_debt_rate_pct),
      avg_yield_pct: nOrNull(c.avg_yield_pct),
      leverage_pct: nOrNull(c.leverage_pct),
    })),
  };
}

const base = (userId: string) => `users/${userId}/intelligence/statements`;
// Solo `year` y `month`: cualquier otro query param es 400 en el API.
const qs = (p: StatementPeriod) => `?year=${p.year}&month=${p.month}`;

export const statementsApi = {
  getIncome: (userId: string, period: StatementPeriod) =>
    api.getOne<IncomeStatement>(`${base(userId)}/income${qs(period)}`).then(normalizeIncome),
  getBalance: (userId: string) =>
    api.getOne<BalanceSheet>(`${base(userId)}/balance`).then(normalizeBalance),
  getCashFlow: (userId: string, period: StatementPeriod) =>
    api.getOne<CashFlowStatement>(`${base(userId)}/cash-flow${qs(period)}`).then(normalizeCashFlow),
  getHealth: (userId: string, period: StatementPeriod) =>
    api.getOne<FinancialHealth>(`${base(userId)}/health${qs(period)}`).then(normalizeHealth),
};
