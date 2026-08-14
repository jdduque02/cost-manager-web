import { api, setTokens, clearTokens, setStoredUserId } from "./client";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface EncryptResult {
  encrypted_password: string;
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

export const authApi = {
  async encryptPassword(password: string): Promise<string> {
    const result = await api.post<unknown>("auth/encrypt", { password });
    const r = Array.isArray(result) ? result[0] : result;
    if (typeof r === "string") return r;
    if (r && typeof r === "object" && "encrypted_password" in r)
      return (r as EncryptResult).encrypted_password;
    throw new Error("Formato inesperado de /auth/encrypt");
  },

  async login(payload: LoginPayload): Promise<LoginResult> {
    const encryptedPassword = await this.encryptPassword(payload.password);
    const tokens = await api.post<AuthTokens[]>("auth/login", {
      username: payload.username,
      password: encryptedPassword,
    });
    const t = Array.isArray(tokens) ? tokens[0] : tokens;
    setTokens(t.access_token, t.refresh_token, t.userId);
    if (t.userId != null) setStoredUserId(t.userId);
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      userId: t.userId,
    };
  },

  async logout(): Promise<void> {
    try {
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
};
