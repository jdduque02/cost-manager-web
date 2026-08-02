import { api } from "./client";

export type TransactionType = "income" | "expense" | "investment";

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
  category_id: number;
  subcategory_id?: number;
  type: TransactionType;
  amount: number;
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
  created_at: string;
  updated_at: string | null;
}

export interface CreateTransactionDto {
  category_id: number;
  subcategory_id?: number;
  type: TransactionType;
  amount: number;
  is_fixed?: boolean;
  fixed_type?: FixedType;
  frequency?: FixedFrequency;
  due_day?: number;
  reminder_days?: number;
  payment_method?: PaymentMethod;
  description?: string;
  reference_code?: string;
  attachments?: string[];
  source_account?: string;
  destination_account?: string;
  source_bank?: string;
  destination_bank?: string;
  addressee?: string;
  created_at?: string;
}

export type FinancialObjectiveType = "loan" | "savings" | "goal";
export type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type QuotaFrequency = "weekly" | "biweekly" | "monthly";

export interface FinancialObjective {
  id: number;
  user_id: number;
  category_id?: number;
  subcategory_id?: number;
  name: string;
  type: FinancialObjectiveType;
  target_amount: number;
  current_balance: number;
  interest_rate?: number;
  fees?: number;
  monthly_payment?: number;
  owner?: string;
  frequency?: Frequency;
  due_day?: number;
  start_date?: string;
  end_date?: string;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateObjectiveDto {
  name: string;
  type: FinancialObjectiveType;
  target_amount: number;
  current_balance?: number;
  category_id?: number;
  subcategory_id?: number;
  interest_rate?: number;
  fees?: number;
  monthly_payment?: number;
  owner?: string;
  frequency?: Frequency;
  due_day?: number;
  start_date?: string;
  end_date?: string;
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
  target_amount: number;
  current_balance?: number;
  start_date?: string;
  end_date?: string;
  frequency: QuotaFrequency;
}

export interface CalculateQuotaResponse {
  target_amount: number;
  current_balance: number;
  amount_to_save: number;
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

export const financeApi = {
  getTransactions: (userId: string) =>
    api
      .get<TransactionRecord[]>(`users/${userId}/transactions`)
      .then((txs) => txs.map((t) => ({ ...t, amount: Number(t.amount ?? 0) }))),
  createTransaction: (userId: string, dto: CreateTransactionDto) =>
    api.post<TransactionRecord>(`users/${userId}/transactions`, dto),
  updateTransaction: (userId: string, id: string, dto: Partial<CreateTransactionDto>) =>
    api.patch<TransactionRecord>(`users/${userId}/transactions/${id}`, dto),
  deleteTransaction: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/transactions/${id}`),

  getObjectives: (userId: string) =>
    api.get<FinancialObjective[]>(`users/${userId}/financial-objectives`).then((objs) =>
      objs.map((o) => ({
        ...o,
        target_amount: Number(o.target_amount ?? 0),
        current_balance: Number(o.current_balance ?? 0),
        interest_rate: o.interest_rate != null ? Number(o.interest_rate) : undefined,
        fees: o.fees != null ? Number(o.fees) : undefined,
        monthly_payment: o.monthly_payment != null ? Number(o.monthly_payment) : undefined,
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
};
