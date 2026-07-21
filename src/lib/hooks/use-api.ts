import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi, type CreateTransactionDto, type CreateObjectiveDto } from "@/lib/api/finance";
import { bankingApi, type CreateBankAccountDto, type CreateFinancialAssetDto, type CreateFinancialLiabilityDto } from "@/lib/api/banking";
import { identityApi, type CreateFinancialBudgetProfileDto, type UpdateFinancialBudgetProfileDto } from "@/lib/api/identity";
import { catalogApi } from "@/lib/api/catalog";
import { useAuth } from "@/lib/auth";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const qk = {
  transactions: (userId: string) => ["transactions", userId] as const,
  objectives: (userId: string) => ["objectives", userId] as const,
  periods: (userId: string) => ["periods", userId] as const,
  accounts: (userId: string) => ["bank-accounts", userId] as const,
  assets: (userId: string) => ["financial-assets", userId] as const,
  liabilities: (userId: string) => ["financial-liabilities", userId] as const,
  financialBudgetProfile: (userId: string) => ["financialBudgetProfile", userId] as const,
  categories: ["categories"] as const,
  subcategories: (userId: string, categoryId?: number) =>
    ["subcategories", userId, categoryId] as const,
  financialSummary: (userId: string) => ["financialSummary", userId] as const,
  taxSummary: (userId: string, year?: number) => ["taxSummary", userId, year] as const,
};

// ─── Finance Hooks ────────────────────────────────────────────────────────────

export function useTransactions() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.transactions(userId ?? ""),
    queryFn: () => financeApi.getTransactions(userId!),
    enabled: !!userId,
  });
}

export function useCreateTransaction() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionDto) =>
      financeApi.createTransaction(userId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.transactions(userId ?? "") });
    },
  });
}

export function useDeleteTransaction() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteTransaction(userId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.transactions(userId ?? "") });
    },
  });
}

export function useObjectives() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.objectives(userId ?? ""),
    queryFn: () => financeApi.getObjectives(userId!),
    enabled: !!userId,
  });
}

export function useCreateObjective() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateObjectiveDto) =>
      financeApi.createObjective(userId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.objectives(userId ?? "") });
    },
  });
}

export function usePeriods() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.periods(userId ?? ""),
    queryFn: () => financeApi.getPeriods(userId!),
    enabled: !!userId,
  });
}

// ─── Banking Hooks ────────────────────────────────────────────────────────────

export function useBankAccounts() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.accounts(userId ?? ""),
    queryFn: () => bankingApi.getAccounts(userId!),
    enabled: !!userId,
  });
}

export function useCreateBankAccount() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBankAccountDto) =>
      bankingApi.createAccount(userId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.accounts(userId ?? "") });
    },
  });
}

export function useFinancialAssets() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.assets(userId ?? ""),
    queryFn: () => bankingApi.getAssets(userId!),
    enabled: !!userId,
  });
}

export function useCreateFinancialAsset() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFinancialAssetDto) =>
      bankingApi.createAsset(userId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.assets(userId ?? "") });
    },
  });
}

export function useFinancialLiabilities() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.liabilities(userId ?? ""),
    queryFn: () => bankingApi.getLiabilities(userId!),
    enabled: !!userId,
  });
}

export function useCreateFinancialLiability() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFinancialLiabilityDto) =>
      bankingApi.createLiability(userId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.liabilities(userId ?? "") });
    },
  });
}

export function useNetWorth() {
  const accounts = useBankAccounts();
  const assets = useFinancialAssets();
  const liabilities = useFinancialLiabilities();

  const isLoading = accounts.isLoading || assets.isLoading || liabilities.isLoading;
  const error = accounts.error ?? assets.error ?? liabilities.error;

  const summary =
    accounts.data && assets.data && liabilities.data
      ? bankingApi.computeNetWorth(assets.data, liabilities.data, accounts.data)
      : null;

  return { summary, isLoading, error };
}

// ─── Identity Hooks - Financial Budget Profile ────────────────────────────────

export function useFinancialBudgetProfile() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.financialBudgetProfile(userId ?? ""),
    queryFn: () => identityApi.getFinancialBudgetProfile(userId!),
    enabled: !!userId,
  });
}

export function useCreateFinancialBudgetProfile() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFinancialBudgetProfileDto) =>
      identityApi.createFinancialBudgetProfile(userId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.financialBudgetProfile(userId ?? "") });
    },
  });
}

export function useUpdateFinancialBudgetProfile() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateFinancialBudgetProfileDto) =>
      identityApi.updateFinancialBudgetProfile(userId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.financialBudgetProfile(userId ?? "") });
    },
  });
}

export function useDeleteFinancialBudgetProfile() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => identityApi.deleteFinancialBudgetProfile(userId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.financialBudgetProfile(userId ?? "") });
    },
  });
}

// ─── Catalog Hooks ────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: () => catalogApi.getCategories(),
  });
}

export function useSubcategories(categoryId?: number) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.subcategories(userId ?? "", categoryId),
    queryFn: () => catalogApi.getSubcategories(userId!, categoryId),
    enabled: !!userId,
  });
}

// ─── Intelligence Hooks ───────────────────────────────────────────────────────

import { api } from "@/lib/api/client";

export interface FinancialSummary {
  id: number;
  user_id: number;
  financial_period_id: number;
  total_income: number;
  total_expense: number;
  total_debt: number;
  net_worth: number;
  expense_ratio: number | null;
  debt_ratio: number | null;
  savings_rate: number | null;
  recommended_max_expense: number | null;
  recommended_savings: number | null;
  is_over_spending: boolean;
  is_over_indebted: boolean;
  insights: Array<{
    type: string;
    severity: string;
    message: string;
    category_id?: number;
    suggested_action?: string;
  }>;
  calculated_at: string | null;
  is_final: boolean;
}

export interface TaxSummary {
  id: number;
  user_id: number;
  fiscal_year: number;
  total_income: number;
  total_assets: number;
  total_liabilities: number;
  patrimony: number | null;
  income_in_uvt: number | null;
  assets_in_uvt: number | null;
  uvt_value: number;
  must_declare: boolean;
  estimated_tax: number | null;
  created_at: string;
}

export function useFinancialSummary() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.financialSummary(userId ?? ""),
    queryFn: () => api.get<FinancialSummary>(`users/${userId}/intelligence/financial-summary`),
    enabled: !!userId,
  });
}

export function useTaxSummary(year?: number) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.taxSummary(userId ?? "", year),
    queryFn: () => {
      const qs = year ? `?year=${year}` : "";
      return api.get<TaxSummary>(`users/${userId}/intelligence/tax-summary${qs}`);
    },
    enabled: !!userId,
  });
}
