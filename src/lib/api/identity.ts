import { api } from "./client";

export interface User {
  id: string;
  external_id: string;
  username: string;
  email: string;
  locale?: string;
  timezone?: string;
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  document_id?: string | null;
  metadata?: Record<string, unknown>;
  roles?: string[];
  is_active: boolean;
  last_login_at?: string | null;
  is_online?: boolean;
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
  investment_ratio: number;
  max_debt_ratio: number;
  monthly_income?: number | null;
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
  investment_ratio?: number;
  max_debt_ratio?: number;
  monthly_income?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateFinancialBudgetProfileDto {
  profile_name?: string;
  is_custom?: boolean;
  needs_ratio?: number;
  wants_ratio?: number;
  savings_ratio?: number;
  investment_ratio?: number;
  max_debt_ratio?: number;
  monthly_income?: number;
  metadata?: Record<string, unknown>;
}

export type UpdateUserDto = Partial<
  Pick<
    User,
    | "username"
    | "email"
    | "locale"
    | "timezone"
    | "full_name"
    | "phone"
    | "address"
    | "document_id"
    | "metadata"
  >
>;

function normalizeProfile(p: FinancialProfile): FinancialProfile {
  return {
    ...p,
    needs_ratio: Number(p.needs_ratio ?? 0),
    wants_ratio: Number(p.wants_ratio ?? 0),
    savings_ratio: Number(p.savings_ratio ?? 0),
    investment_ratio: Number(p.investment_ratio ?? 0),
    max_debt_ratio: Number(p.max_debt_ratio ?? 0),
    monthly_income: p.monthly_income != null ? Number(p.monthly_income) : null,
  };
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  address?: string;
  document_id?: string;
  /** Versión de los términos/política aceptada (prueba de autorización, Ley 1581). */
  accepted_terms_version?: string;
  locale?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateUserResponse {
  id: string;
  external_id: string;
  username: string;
  email: string;
}

export const identityApi = {
  createUser: (dto: CreateUserDto) => api.post<CreateUserResponse>("user", dto),
  getStatus: async () => {
    const result = await api.get<{ status: string }[]>("user/public/status");
    return Array.isArray(result) ? result[0] : result;
  },
  getUser: async (id: string, token?: string | null): Promise<User> => {
    const result = await api.get<User[]>(`user/${id}`, token);
    return Array.isArray(result) ? result[0] : result;
  },
  getUsers: () => api.get<User[]>("user"),
  updateUser: (
    id: string,
    dto: Partial<Omit<User, "id" | "created_at" | "updated_at" | "external_id">>,
  ) => api.patch<User>(`user/${id}`, dto),
  getFinancialProfile: async (userId: string, token?: string | null): Promise<FinancialProfile> => {
    const result = await api.get<FinancialProfile[]>(`user/${userId}/financial-profile`, token);
    return normalizeProfile(Array.isArray(result) ? result[0] : result);
  },
  updateFinancialProfile: (userId: string, dto: Partial<FinancialProfile>, token?: string | null) =>
    api.patch<FinancialProfile>(`user/${userId}/financial-profile`, dto, token),
  getFinancialBudgetProfile: async (
    userId: string,
    token?: string | null,
  ): Promise<FinancialProfile> => {
    const result = await api.get<FinancialProfile[]>(`user/${userId}/financial-profile`, token);
    return normalizeProfile(Array.isArray(result) ? result[0] : result);
  },
  createFinancialBudgetProfile: (
    userId: string,
    dto: CreateFinancialBudgetProfileDto,
    token?: string | null,
  ) => api.post<FinancialProfile>(`user/${userId}/financial-profile`, dto, token),
  updateFinancialBudgetProfile: (
    userId: string,
    dto: UpdateFinancialBudgetProfileDto,
    token?: string | null,
  ) => api.patch<FinancialProfile>(`user/${userId}/financial-profile`, dto, token),
  deleteFinancialBudgetProfile: (userId: string, token?: string | null) =>
    api.delete<{ message: string }>(`user/${userId}/financial-profile`, token),
};
