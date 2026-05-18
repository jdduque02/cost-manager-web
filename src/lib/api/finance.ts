import { api } from "./client";

export type TransactionType = "INCOME" | "EXPENSE";

export interface TransactionRecord {
  id: string;
  name: string;
  description?: string;
  amount: number;
  type: TransactionType;
  category?: string;
  subcategoryId?: string;
  date: string;
  userId: string;
  financialPeriodId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  name: string;
  description?: string;
  amount: number;
  type: TransactionType;
  subcategoryId?: string;
  date: string;
  financialPeriodId?: string;
}

export interface FinancialObjective {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  userId: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export interface CreateObjectiveDto {
  name: string;
  targetAmount: number;
  deadline?: string;
}

export interface FinancialPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  userId: string;
  createdAt: string;
}

export const financeApi = {
  getTransactions: (userId: string) =>
    api.get<TransactionRecord[]>(`users/${userId}/transactions`),
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
    api.get<{ id: string; amount: number; date: string }[]>(
      `users/${userId}/financial-objectives/${objectiveId}/payments`
    ),
  createObjectivePayment: (
    userId: string,
    objectiveId: string,
    dto: { amount: number; date: string }
  ) =>
    api.post(`users/${userId}/financial-objectives/${objectiveId}/payments`, dto),

  getPeriods: (userId: string) =>
    api.get<FinancialPeriod[]>(`users/${userId}/financial-periods`),
  createPeriod: (userId: string, dto: { name: string; startDate: string; endDate: string }) =>
    api.post<FinancialPeriod>(`users/${userId}/financial-periods`, dto),
  closePeriod: (userId: string, id: string) =>
    api.patch<FinancialPeriod>(`users/${userId}/financial-periods/${id}/close`, {}),
};
