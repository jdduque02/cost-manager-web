import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi, type CreateTransactionDto, type CreateObjectiveDto } from "@/lib/api/finance";
import { bankingApi } from "@/lib/api/banking";
import { identityApi, type CreateFinancialBudgetProfileDto, type UpdateFinancialBudgetProfileDto } from "@/lib/api/identity";
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

export function useFinancialAssets() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.assets(userId ?? ""),
    queryFn: () => bankingApi.getAssets(userId!),
    enabled: !!userId,
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

// ─── Identity Hooks - Financial Budget Profile ──────────────────────────────────

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
