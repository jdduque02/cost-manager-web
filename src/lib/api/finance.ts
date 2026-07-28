import { api } from "./client";

export type TransactionType = "income" | "expense";

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
  days_in_period: number;
  quota_amount: number;
  monthly_income: number | null;
  savings_ratio: number;
  max_allowed_per_period: number | null;
  is_within_budget: boolean | null;
  bank: string | null;
  current_profitability: number | null;
  projected_final_balance: number | null;
  has_financial_profile: boolean;
  warnings: string[];
  recommendations: string[];
}

export const financeApi = {
  getTransactions: (userId: string) => api.get<TransactionRecord[]>(`users/${userId}/transactions`),
  createTransaction: (userId: string, dto: CreateTransactionDto) =>
    api.post<TransactionRecord>(`users/${userId}/transactions`, dto),
  updateTransaction: (userId: string, id: string, dto: Partial<CreateTransactionDto>) =>
    api.patch<TransactionRecord>(`users/${userId}/transactions/${id}`, dto),
  deleteTransaction: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/transactions/${id}`),

  getObjectives: (userId: string) =>
    api.get<FinancialObjective[]>(`users/${userId}/financial-objectives`),
  createObjective: (userId: string, dto: CreateObjectiveDto) =>
    api.post<FinancialObjective>(`users/${userId}/financial-objectives`, dto),
  updateObjective: (userId: string, id: string, dto: Partial<CreateObjectiveDto>) =>
    api.patch<FinancialObjective>(`users/${userId}/financial-objectives/${id}`, dto),
  deleteObjective: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/financial-objectives/${id}`),

  getObjectivePayments: (userId: string, objectiveId: string) =>
    api.get<ObjectivePayment[]>(`users/${userId}/financial-objectives/${objectiveId}/payments`),
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

  calculateQuota: (userId: string, dto: CalculateQuotaRequest) =>
    api.post<CalculateQuotaResponse>(`users/${userId}/financial-objectives/calculate-quota`, dto),
};
