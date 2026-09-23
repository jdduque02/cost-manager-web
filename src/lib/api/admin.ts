import { api } from "./client";
import type { User } from "./identity";

export interface AdminUserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
  sortBy?: "username" | "email" | "created_at" | "updated_at" | "last_login_at";
  order?: "ASC" | "DESC";
}

export interface AdminUserListResult {
  data: User[];
  total: number;
}

interface AdminSession {
  id: string;
  ipAddress?: string;
  browser?: string;
  start?: string;
  lastAccess?: string | null;
}

interface AdminAccessEvent {
  type?: string;
  ipAddress?: string;
  time?: number | string;
  error?: string | null;
  details?: Record<string, unknown>;
}

export interface AdminUserDetail {
  user: User;
  sessions: AdminSession[];
  accessHistory: AdminAccessEvent[];
}

export const adminApi = {
  async getUsers(query: AdminUserQuery = {}): Promise<AdminUserListResult> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    if (query.role) params.set("role", query.role);
    if (typeof query.is_active === "boolean") params.set("is_active", String(query.is_active));
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.order) params.set("order", query.order);
    const qs = params.toString();
    const endpoint = qs ? `admin/users?${qs}` : "admin/users";
    return api.getPaginated<AdminUserListResult>(endpoint);
  },

  async getUserDetail(id: string): Promise<AdminUserDetail> {
    const result = await api.get<AdminUserDetail[] | AdminUserDetail>(`admin/users/${id}`);
    const detail = Array.isArray(result) ? result[0] : result;
    return {
      user: detail.user,
      sessions: detail.sessions ?? [],
      accessHistory: detail.accessHistory ?? [],
    };
  },

  updateStatus: (id: string, is_active: boolean) =>
    api.patch<User>(`admin/users/${id}/status`, { is_active }),

  updateRoles: (id: string, roles: string[]) =>
    api.patch<User>(`admin/users/${id}/roles`, { roles }),

  resetPassword: (id: string) =>
    api.post<{ message: string }>(`admin/users/${id}/reset-password`, {}),

  revokeAllSessions: (id: string) => api.delete<{ message: string }>(`admin/users/${id}/sessions`),

  revokeSession: (id: string, sessionId: string) =>
    api.delete<{ message: string }>(`admin/users/${id}/sessions/${sessionId}`),
};
