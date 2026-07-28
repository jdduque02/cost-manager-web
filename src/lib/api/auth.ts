import { api, setTokens, clearTokens, getAccessToken, getRefreshToken } from "./client";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface EncryptResult {
  encrypted_password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  userId?: number;
}

export interface IntrospectResult {
  active: boolean;
  exp?: number;
  iat?: number;
  sub: string;
  username?: string;
  email?: string;
  realm_access?: { roles: string[] };
  expires_in_seconds?: number;
  userId?: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  userId?: number;
}

export const authApi = {
  async encryptPassword(password: string): Promise<string> {
    const result = await api.post<EncryptResult[]>("auth/encrypt", { password });
    const r = Array.isArray(result) ? result[0] : result;
    return r.encrypted_password;
  },

  async login(payload: LoginPayload): Promise<LoginResult> {
    const encryptedPassword = await this.encryptPassword(payload.password);
    const tokens = await api.post<AuthTokens[]>("auth/login", {
      username: payload.username,
      password: encryptedPassword,
    });
    const t = Array.isArray(tokens) ? tokens[0] : tokens;
    setTokens(t.access_token, t.refresh_token);
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      userId: t.userId,
    };
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = getRefreshToken();
      await api.post<void>("auth/logout", { refresh_token: refreshToken });
    } finally {
      clearTokens();
    }
  },

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("auth/forgot-password", { email }),

  introspect: async (token?: string | null): Promise<IntrospectResult> => {
    const result = await api.post<IntrospectResult[]>("auth/introspect", { token: token ?? getAccessToken() });
    return Array.isArray(result) ? result[0] : result;
  },
};
