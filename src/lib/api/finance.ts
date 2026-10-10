import { api } from "./client";

export type TransactionType = "income" | "expense" | "investment" | "transfer";

type CategoryStatus = "categorized" | "pending";

export type FixedType = "deduction" | "fixed_income";
export type FixedFrequency = "biweekly" | "monthly";

export type PaymentMethod =
  | "bank_transfer"
  | "cash"
  | "debit_card"
  | "credit_card"
  | "digital_wallet"
  | "mobile_payment"
  | "check"
  | "crypto";

export interface TransactionRecord {
  id: number;
  user_id: number;
  category_id: number | null;
  category_status: CategoryStatus;
  installments?: number | null;
  installment_value?: number | null;
  subcategory_id?: number;
  type: TransactionType;
  amount: number;
  currency: string;
  /** Monto aplicado al producto en su moneda si difiere de `currency` (COP/USD); null = sin conversión. */
  applied_amount?: number | null;
  /** TRM usada (COP por 1 USD); null = sin conversión. */
  fx_rate?: number | null;
  is_fixed: boolean;
  fixed_type?: FixedType | null;
  frequency?: FixedFrequency | null;
  due_day?: number | null;
  reminder_days?: number | null;
  payment_method?: PaymentMethod;
  description?: string;
  reference_code?: string;
  attachments?: string[];
  source_account?: string;
  destination_account?: string;
  source_bank?: string;
  destination_bank?: string;
  addressee?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string | null;
  objective_id?: number | null;
  account_id?: number | null;
  asset_id?: number | null;
  liability_id?: number | null;
  company_id?: number | null;
  transfer_group_id?: string | null;
  origin_account_id?: number | null;
  destination_account_id?: number | null;
  /** Origen del movimiento; "reconciliation" = ajuste de un cierre (lo asigna el servidor). */
  source?: string | null;
  /** Recurrente que generó el movimiento (bigint: la capa API lo pasa a number). */
  recurring_id?: number | null;
  /** Generado por un recurrente `confirm` y aún sin validar. */
  needs_validation?: boolean;
}

export interface TransactionQuery {
  date_from?: string;
  date_to?: string;
  type?: TransactionType;
  category_id?: number;
  category_status?: CategoryStatus;
  uncategorized?: boolean;
  subcategory_id?: number;
  objective_id?: number;
  account_id?: number;
  asset_id?: number;
  liability_id?: number;
  company_id?: number;
  currency?: string;
  needs_validation?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateTransactionDto {
  category_id?: number;
  subcategory_id?: number;
  type: TransactionType;
  amount: number;
  currency?: string;
  is_fixed?: boolean;
  fixed_type?: FixedType;
  frequency?: FixedFrequency;
  due_day?: number;
  reminder_days?: number;
  payment_method?: PaymentMethod;
  installments?: number;
  installment_value?: number;
  description?: string;
  reference_code?: string;
  attachments?: string[];
  source_account?: string;
  destination_account?: string;
  source_bank?: string;
  destination_bank?: string;
  addressee?: string;
  transaction_date?: string;
  created_at?: string;
  objective_id?: number;
  account_id?: number;
  asset_id?: number;
  liability_id?: number;
  company_id?: number;
}

type FinancialObjectiveType = "loan" | "savings" | "goal" | "emergency_fund";
type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type QuotaFrequency = "weekly" | "biweekly" | "monthly";

export interface FinancialObjective {
  id: number;
  user_id: number;
  category_id?: number;
  subcategory_id?: number;
  name: string;
  type: FinancialObjectiveType;
  target_amount: number | null;
  current_balance: number;
  interest_rate?: number;
  fees?: number;
  monthly_payment?: number;
  owner?: string;
  bank?: string | null;
  current_profitability?: number | null;
  months_of_expenses_covered?: number | null;
  account_id?: number | null;
  frequency?: Frequency;
  due_day?: number;
  start_date?: string;
  end_date?: string;
  quota_calculation?: Record<string, unknown> | null;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateObjectiveDto {
  name: string;
  type: FinancialObjectiveType;
  target_amount?: number | null;
  current_balance?: number;
  category_id?: number;
  subcategory_id?: number;
  interest_rate?: number;
  fees?: number;
  monthly_payment?: number;
  owner?: string;
  bank?: string;
  current_profitability?: number;
  account_id?: number;
  frequency?: Frequency;
  due_day?: number;
  start_date?: string;
  end_date?: string;
  quota_calculation?: Record<string, unknown>;
}

export interface UpdateTransactionDto extends Partial<CreateTransactionDto> {
  apply_to_similar?: boolean;
}

export interface FinancialPeriod {
  id: number;
  user_id: number;
  year: number;
  month: number;
  is_closed: boolean;
  closed_at?: string | null;
  created_at: string;
}

export interface ObjectivePayment {
  id: number;
  objective_id: number;
  user_id: number;
  amount: number;
  payment_date: string;
  note?: string;
  created_at: string;
}

export interface CalculateQuotaRequest {
  target_amount?: number;
  current_balance?: number;
  start_date?: string;
  end_date?: string;
  frequency: QuotaFrequency;
  account_id?: number;
  interest_rate?: number;
}

export interface CalculateQuotaResponse {
  target_amount: number | null;
  current_balance: number;
  amount_to_save: number | null;
  start_date: string;
  end_date: string | null;
  frequency: string;
  total_periods: number;
  quota_amount: number;
  savings_ratio: number | string;
  is_within_budget: boolean | null;
  has_financial_profile: boolean;
  monthly_income_visible?: boolean;
  monthly_income?: number | null;
  max_allowed_per_period?: number | null;
  days_in_period?: number;
  bank?: string | null;
  current_profitability?: number | null;
  projected_final_balance?: number | null;
  warnings?: string[];
  recommendations?: string[];
}

export type TransactionGroupBy = "day" | "week" | "month";

interface TransactionSummaryTotals {
  income: number;
  expenses: number;
  investments: number;
  count: number;
}

interface TransactionSummaryCategory {
  category_id: number;
  income: number;
  expenses: number;
  investments: number;
  count: number;
}

/** Nombre de un grupo de `by_category`: el API agrupa lo que no tiene categoría en `category_id` 0 (R6.7). */
export function summaryCategoryName(
  id: number,
  names: Record<number, string>,
  unknown = `Categoría ${id}`,
): string {
  return names[id] ?? (id === 0 ? "Sin clasificar" : unknown);
}

interface TransactionSummarySeriesItem {
  key: string;
  label: string;
  income: number;
  expenses: number;
  investments: number;
  count: number;
}

interface TransactionSummaryCompany {
  company_id: number;
  company_name: string;
  expenses: number;
  count: number;
  percent_of_total: number;
}

export interface TransactionSummary {
  date_from?: string;
  date_to?: string;
  group_by: TransactionGroupBy;
  totals: TransactionSummaryTotals;
  by_category: TransactionSummaryCategory[];
  by_company?: TransactionSummaryCompany[];
  series: TransactionSummarySeriesItem[];
}

export interface TransactionSummaryQuery {
  date_from: string;
  date_to: string;
  group_by?: TransactionGroupBy;
  type?: TransactionType;
  /** Obligatorio: sin él el API suma todas las monedas en un solo total. */
  currency: "COP" | "USD";
}

export const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

export function buildQueryString(params?: object): string {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** `amount`/`applied_amount`/`fx_rate` (numeric) y `recurring_id` (bigint) llegan como string. */
const normalizeTransaction = (t: TransactionRecord): TransactionRecord => ({
  ...t,
  amount: Number(t.amount ?? 0),
  applied_amount: numOrNull(t.applied_amount),
  fx_rate: numOrNull(t.fx_rate),
  recurring_id: t.recurring_id == null ? null : Number(t.recurring_id),
});

/** El envoltorio del API siempre trae `data` como arreglo, aun con un solo objeto. */
const first = <T>(result: T | T[]): T => (Array.isArray(result) ? result[0] : result);

export const financeApi = {
  getTransactions: (userId: string, params?: TransactionQuery) =>
    api
      .get<TransactionRecord[]>(`users/${userId}/transactions${buildQueryString(params)}`)
      .then((txs) => txs.map(normalizeTransaction)),
  getTransactionSummary: (userId: string, params: TransactionSummaryQuery) =>
    api
      .get<TransactionSummary>(`users/${userId}/transactions/summary${buildQueryString(params)}`)
      .then((result) => {
        const s = Array.isArray(result) ? (result[0] as TransactionSummary) : result;
        return {
          ...s,
          totals: {
            ...s.totals,
            income: Number(s.totals?.income ?? 0),
            expenses: Number(s.totals?.expenses ?? 0),
            investments: Number(s.totals?.investments ?? 0),
            count: Number(s.totals?.count ?? 0),
          },
          by_category: (s.by_category ?? []).map((c) => ({
            ...c,
            income: Number(c.income ?? 0),
            expenses: Number(c.expenses ?? 0),
            investments: Number(c.investments ?? 0),
            count: Number(c.count ?? 0),
          })),
          series: (s.series ?? []).map((i) => ({
            ...i,
            income: Number(i.income ?? 0),
            expenses: Number(i.expenses ?? 0),
            investments: Number(i.investments ?? 0),
            count: Number(i.count ?? 0),
          })),
        };
      }),
  createTransaction: (userId: string, dto: CreateTransactionDto) =>
    api.post<TransactionRecord>(`users/${userId}/transactions`, dto),
  updateTransaction: (userId: string, id: string, dto: UpdateTransactionDto) =>
    api.patch<TransactionRecord>(`users/${userId}/transactions/${id}`, dto),
  deleteTransaction: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/transactions/${id}`),
  bulkDeleteTransactions: (userId: string, ids: number[]) =>
    api.deleteWithBody<void>(`users/${userId}/transactions`, { ids }),

  getObjectives: (userId: string) =>
    api.get<FinancialObjective[]>(`users/${userId}/financial-objectives`).then((objs) =>
      objs.map((o) => ({
        ...o,
        target_amount: Number(o.target_amount ?? 0),
        current_balance: Number(o.current_balance ?? 0),
        interest_rate: o.interest_rate != null ? Number(o.interest_rate) : undefined,
        fees: o.fees != null ? Number(o.fees) : undefined,
        monthly_payment: o.monthly_payment != null ? Number(o.monthly_payment) : undefined,
        current_profitability:
          o.current_profitability != null ? Number(o.current_profitability) : null,
        months_of_expenses_covered:
          o.months_of_expenses_covered != null ? Number(o.months_of_expenses_covered) : null,
      })),
    ),
  createObjective: (userId: string, dto: CreateObjectiveDto) =>
    api.post<FinancialObjective>(`users/${userId}/financial-objectives`, dto),
  updateObjective: (userId: string, id: string, dto: Partial<CreateObjectiveDto>) =>
    api.patch<FinancialObjective>(`users/${userId}/financial-objectives/${id}`, dto),
  deleteObjective: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/financial-objectives/${id}`),

  getObjectivePayments: (userId: string, objectiveId: string) =>
    api
      .get<ObjectivePayment[]>(`users/${userId}/financial-objectives/${objectiveId}/payments`)
      .then((payments) => payments.map((p) => ({ ...p, amount: Number(p.amount ?? 0) }))),
  createObjectivePayment: (
    userId: string,
    objectiveId: string,
    dto: { amount: number; payment_date: string; note?: string },
  ) =>
    api.post<ObjectivePayment>(`users/${userId}/financial-objectives/${objectiveId}/payments`, dto),

  getPeriods: (userId: string) => api.get<FinancialPeriod[]>(`users/${userId}/financial-periods`),
  createPeriod: (userId: string, dto: { year: number; month: number }) =>
    api.post<FinancialPeriod>(`users/${userId}/financial-periods`, dto),
  closePeriod: (userId: string, id: string) =>
    api.patch<FinancialPeriod>(`users/${userId}/financial-periods/${id}/close`, {}),

  calculateQuota: async (userId: string, dto: CalculateQuotaRequest) => {
    const result = await api.post<CalculateQuotaResponse[]>(
      `users/${userId}/financial-objectives/calculate-quota`,
      dto,
    );
    const q = Array.isArray(result) ? result[0] : (result as CalculateQuotaResponse);
    return {
      ...q,
      target_amount: Number(q.target_amount ?? 0),
      current_balance: Number(q.current_balance ?? 0),
      amount_to_save: Number(q.amount_to_save ?? 0),
      total_periods: Number(q.total_periods ?? 0),
      quota_amount: Number(q.quota_amount ?? 0),
      savings_ratio: Number(q.savings_ratio ?? 0),
      monthly_income: q.monthly_income != null ? Number(q.monthly_income) : null,
      max_allowed_per_period:
        q.max_allowed_per_period != null ? Number(q.max_allowed_per_period) : null,
      days_in_period: q.days_in_period != null ? Number(q.days_in_period) : undefined,
      current_profitability:
        q.current_profitability != null ? Number(q.current_profitability) : null,
      projected_final_balance:
        q.projected_final_balance != null ? Number(q.projected_final_balance) : null,
    };
  },

  // ── Transferencias ────────────────────────────────────────────
  getTransfers: (userId: string, page = 1, limit = 20) =>
    api.get<TransferResponse[]>(`users/${userId}/transfers?page=${page}&limit=${limit}`),
  getTransfer: (userId: string, id: string) =>
    api.getOne<TransferResponse>(`users/${userId}/transfers/${id}`),
  createTransfer: (userId: string, dto: CreateTransferDto) =>
    api.post<TransferResponse>(`users/${userId}/transfers`, dto),
  updateTransfer: (userId: string, id: string, dto: Partial<CreateTransferDto>) =>
    api.patch<TransferResponse>(`users/${userId}/transfers/${id}`, dto),
  deleteTransfer: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/transfers/${id}`),
  cloneTransfer: (
    userId: string,
    id: string,
    dto?: { transaction_date?: string; amount?: number; description?: string },
  ) => api.post<TransferResponse>(`users/${userId}/transfers/${id}/clone`, dto ?? {}),
  /** Convierte un ingreso/gasto en transferencia (atómico). `data` llega como arreglo: no se lee, basta invalidar. */
  convertToTransfer: (userId: string, id: string, dto: CreateTransferDto) =>
    api.post<TransferResponse[]>(`users/${userId}/transactions/${id}/convert-to-transfer`, dto),
};

// ── Tipos de transferencia ─────────────────────────────────────

export interface TransferMovement {
  id: number;
  account_id: number | null;
  liability_id: number | null;
  side: "source" | "destination";
  bank_name: string | null;
  account_type: string | null;
  /** En la moneda del origen (`currency`). */
  amount: number;
  currency: string;
  /** Monto acreditado en la moneda de esta pierna si difiere de `currency`; null = sin conversión. */
  applied_amount?: number | null;
  fx_rate?: number | null;
  transaction_date: string;
  description: string | null;
  reference_code: string | null;
  objective_id?: number | null;
  company_id?: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface TransferResponse {
  transfer_group_id: string;
  amount: number;
  transaction_date: string;
  description: string | null;
  reference_code: string | null;
  objective_id?: number | null;
  destination_liability_id?: number | null;
  is_fixed?: boolean;
  frequency?: FixedFrequency | null;
  fixed_type?: FixedType | null;
  due_day?: number | null;
  reminder_days?: number | null;
  source: TransferMovement;
  destination: TransferMovement;
}

export interface CreateTransferDto {
  source_account_id: number;
  destination_account_id?: number;
  destination_liability_id?: number;
  amount: number;
  transaction_date?: string;
  description?: string;
  reference_code?: string;
  is_fixed?: boolean;
  fixed_type?: FixedType;
  frequency?: FixedFrequency;
  due_day?: number;
  reminder_days?: number;
  objective_id?: number;
  company_id?: number;
}

// ── Recurrentes ────────────────────────────────────────────────

export type RecurringMode = "auto" | "confirm";
export type RecurringStatus = "active" | "cancelled" | "finished";

/** Montos e ids ya llegan como number: el API los convierte en su respuesta. */
export interface RecurringTransaction {
  id: number;
  name: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category_id: number | null;
  subcategory_id: number | null;
  account_id: number | null;
  liability_id: number | null;
  origin_account_id: number | null;
  destination_account_id: number | null;
  destination_liability_id: number | null;
  payment_method: PaymentMethod | null;
  frequency: Frequency;
  start_date: string;
  next_due_date: string;
  end_date: string | null;
  max_occurrences: number | null;
  occurrences_count: number;
  remaining_occurrences: number | null;
  mode: RecurringMode;
  reminder_days: number;
  status: RecurringStatus;
  pending_validation_count: number;
  created_at: string;
}

export interface CreateRecurringTransactionDto {
  name: string;
  type: TransactionType;
  amount: number;
  category_id?: number;
  subcategory_id?: number;
  /** Ingreso, gasto o inversión: exactamente uno de `account_id`/`liability_id`. */
  account_id?: number;
  liability_id?: number;
  /** Solo transfer: origen y un destino (cuenta o pasivo). */
  origin_account_id?: number;
  destination_account_id?: number;
  destination_liability_id?: number;
  payment_method?: PaymentMethod;
  frequency: Frequency;
  start_date: string;
  /** Excluyente con `max_occurrences`. */
  end_date?: string;
  max_occurrences?: number;
  mode: RecurringMode;
  reminder_days?: number;
  /** Solo ingreso: moneda propia; el API convierte con TRM. Otros tipos: la del producto (si no, 400). */
  currency?: "COP" | "USD";
}

/** `type`, `frequency`, `start_date` y los destinos de transferencia no se editan (400). */
export interface UpdateRecurringTransactionDto {
  name?: string;
  amount?: number;
  mode?: RecurringMode;
  reminder_days?: number;
  payment_method?: PaymentMethod;
  /** Solo ingreso. */
  currency?: "COP" | "USD";
  category_id?: number | null;
  subcategory_id?: number | null;
  /** Para pasar de cuenta a pasivo (o al revés) envía el anterior en `null`. */
  account_id?: number | null;
  liability_id?: number | null;
  origin_account_id?: number | null;
  /** Fijar uno limpia el otro en el servidor. */
  end_date?: string | null;
  max_occurrences?: number | null;
}

export interface ProcessResult {
  created: number;
  reminders: number;
  adopted: number;
}

const recurringPath = (userId: string) => `users/${userId}/recurring-transactions`;

export const recurringApi = {
  list: (userId: string, status?: RecurringStatus) =>
    api.get<RecurringTransaction[]>(`${recurringPath(userId)}${buildQueryString({ status })}`),
  get: (userId: string, id: number) =>
    api.getOne<RecurringTransaction>(`${recurringPath(userId)}/${id}`),
  create: (userId: string, dto: CreateRecurringTransactionDto) =>
    api.post<RecurringTransaction[]>(recurringPath(userId), dto).then(first),
  update: (userId: string, id: number, dto: UpdateRecurringTransactionDto) =>
    api.patch<RecurringTransaction[]>(`${recurringPath(userId)}/${id}`, dto).then(first),
  cancel: (userId: string, id: number) =>
    api.post<RecurringTransaction[]>(`${recurringPath(userId)}/${id}/cancel`, {}).then(first),
  /** Una vez al día por usuario: otra llamada el mismo día responde todo en 0. */
  process: (userId: string) =>
    api.post<ProcessResult[]>(`${recurringPath(userId)}/process`, {}).then(first),
  /** Responde la transacción cruda (en transferencias, la pierna del id). */
  validate: (
    userId: string,
    transactionId: number,
    dto: { transaction_date: string; amount?: number },
  ) =>
    api
      .post<TransactionRecord[]>(`${recurringPath(userId)}/validate/${transactionId}`, dto)
      .then((r) => normalizeTransaction(first(r))),
};
