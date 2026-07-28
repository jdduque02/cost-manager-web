import { api } from "./client";

export interface User {
  id: string;
  external_id: string;
  username: string;
  email: string;
  locale?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  financial_profile?: FinancialProfile | null;
}

export interface FinancialProfile {
  id: string;
  profile_name: string;
  is_custom: boolean;
  needs_ratio: number;
  wants_ratio: number;
  savings_ratio: number;
  max_debt_ratio: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
  deleted_at?: string | null;
}

export interface CreateFinancialBudgetProfileDto {
  user_id: string;
  profile_name?: string;
  is_custom?: boolean;
  needs_ratio?: number;
  wants_ratio?: number;
  savings_ratio?: number;
  max_debt_ratio?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateFinancialBudgetProfileDto {
  profile_name?: string;
  is_custom?: boolean;
  needs_ratio?: number;
  wants_ratio?: number;
  savings_ratio?: number;
  max_debt_ratio?: number;
  metadata?: Record<string, unknown>;
}

export const identityApi = {
  getStatus: async () => {
    const result = await api.get<{ status: string }[]>("user/public/status");
    return Array.isArray(result) ? result[0] : result;
  },
  getUser: async (id: string, token?: string | null): Promise<User> => {
    const result = await api.get<User[]>(`user/${id}`, token);
    return Array.isArray(result) ? result[0] : result;
  },
  getUsers: () => api.get<User[]>("user"),
  updateUser: (id: string, dto: Partial<Omit<User, "id" | "created_at" | "updated_at" | "external_id">>) =>
    api.patch<User>(`user/${id}`, dto),
  getFinancialProfile: async (userId: string, token?: string | null): Promise<FinancialProfile> => {
    const result = await api.get<FinancialProfile[]>(`user/${userId}/financial-profile`, token);
    return Array.isArray(result) ? result[0] : result;
  },
  updateFinancialProfile: (userId: string, dto: Partial<FinancialProfile>, token?: string | null) =>
    api.patch<FinancialProfile>(`user/${userId}/financial-profile`, dto, token),
  getFinancialBudgetProfile: async (userId: string, token?: string | null): Promise<FinancialProfile> => {
    const result = await api.get<FinancialProfile[]>(`user/${userId}/financial-profile`, token);
    return Array.isArray(result) ? result[0] : result;
  },
  createFinancialBudgetProfile: (userId: string, dto: CreateFinancialBudgetProfileDto, token?: string | null) =>
    api.post<FinancialProfile>(`user/${userId}/financial-profile`, dto, token),
  updateFinancialBudgetProfile: (userId: string, dto: UpdateFinancialBudgetProfileDto, token?: string | null) =>
    api.patch<FinancialProfile>(`user/${userId}/financial-profile`, dto, token),
  deleteFinancialBudgetProfile: (userId: string, token?: string | null) =>
    api.delete<{ message: string }>(`user/${userId}/financial-profile`, token),
};
