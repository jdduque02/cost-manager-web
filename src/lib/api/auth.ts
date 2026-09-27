import { api, setTokens, clearTokens, setStoredUserId, ensureCsrfToken } from "./client";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  userId?: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken?: string;
  userId?: number;
}

export interface Session {
  id: string;
  ipAddress: string;
  browser: string;
  start: string;
  lastAccess: string | null;
}

export interface AccessEvent {
  type: string;
  ipAddress: string;
  time: string;
  error: string | null;
  details: Record<string, unknown>;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    // La contraseña viaja en claro dentro de HTTPS; la API ya no expone auth/encrypt.
    const tokens = await api.post<AuthTokens[]>("auth/login", {
      username: payload.username,
      password: payload.password,
    });
    const t = Array.isArray(tokens) ? tokens[0] : tokens;
    setTokens(t.access_token, t.refresh_token, t.userId, t.expires_in);
    if (t.userId != null) setStoredUserId(t.userId);
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      userId: t.userId,
    };
  },

  async logout(): Promise<void> {
    try {
      // El backend exige token CSRF en logout: es la única mutación que puede
      // llegar sin Bearer (access token ya expirado, solo cookie de refresh).
      await ensureCsrfToken();
      await api.post<void>("auth/logout", {});
    } finally {
      clearTokens();
    }
  },

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("auth/forgot-password", { email }),

  verifyOtp: (email: string, code: string) =>
    api.post<{ reset_token: string; expires_in_seconds: number }>("auth/verify-otp", {
      email,
      code,
    }),

  resetPassword: (email: string, resetToken: string, newPassword: string) =>
    api.post<{ message: string }>("auth/reset-password", {
      email,
      reset_token: resetToken,
      new_password: newPassword,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>("auth/change-password", {
      currentPassword,
      newPassword,
    }),

  getSessions: () => api.get<Session[]>("auth/sessions"),

  revokeSession: (sessionId: string) => api.delete<void>(`auth/sessions/${sessionId}`),

  getAccessHistory: () => api.get<AccessEvent[]>("auth/access-history"),
};
