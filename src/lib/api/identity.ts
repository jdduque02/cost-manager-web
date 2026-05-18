import { api } from "./client";

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialProfile {
  id: string;
  userId: string;
  monthlyIncome: number;
  currency: string;
  country: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialBudgetProfile {
  id: string;
  profile_name: string;
  is_custom: boolean;
  needs_ratio: number;
  wants_ratio: number;
  savings_ratio: number;
  max_debt_ratio: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T[];
  timestamp: string;
}

type FinancialBudgetProfileResponse = ApiResponse<FinancialBudgetProfile>;

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
  getStatus: () => api.get<{ status: string }>("user/public/status"),
  getUser: (id: string, token?: string | null) => api.get<User>(`user/${id}`, token),
  getUsers: () => api.get<User[]>("user"),
  updateUser: (id: string, dto: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>) =>
    api.patch<User>(`user/${id}`, dto),
  getFinancialProfile: (userId: string, token?: string | null) =>
    api.get<FinancialProfile>(`user/${userId}/financial-profile`, token),
  updateFinancialProfile: (userId: string, dto: Partial<FinancialProfile>, token?: string | null) =>
    api.patch<FinancialProfile>(`user/${userId}/financial-profile`, dto, token),
  getFinancialBudgetProfile: async (userId: string, token?: string | null) => {
    const response = await api.get<FinancialBudgetProfileResponse>(`user/${userId}/financial-profile`, token);
    return response.data?.[0] ?? null;
  },
  createFinancialBudgetProfile: async (userId: string, dto: CreateFinancialBudgetProfileDto, token?: string | null) => {
    const response = await api.post<FinancialBudgetProfileResponse>(`user/${userId}/financial-profile`, dto, token);
    return response.data?.[0];
  },
  updateFinancialBudgetProfile: async (userId: string, dto: UpdateFinancialBudgetProfileDto, token?: string | null) => {
    const response = await api.patch<FinancialBudgetProfileResponse>(`user/${userId}/financial-profile`, dto, token);
    return response.data?.[0];
  },
  deleteFinancialBudgetProfile: (userId: string, token?: string | null) =>
    api.delete<{ message: string }>(`user/${userId}/financial-profile`, token),
};
