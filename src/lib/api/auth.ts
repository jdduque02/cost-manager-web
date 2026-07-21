import { api, setTokens, clearTokens, getAccessToken, getRefreshToken } from "./client";

export interface LoginPayload {
  username: string;
  password: string;
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
  async login(payload: LoginPayload): Promise<LoginResult> {
    const tokens = await api.post<AuthTokens>("auth/login", payload);
    setTokens(tokens.access_token, tokens.refresh_token);
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      userId: tokens.userId,
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

  introspect: (token?: string | null) =>
    api.post<IntrospectResult>("auth/introspect", { token: token ?? getAccessToken() }),
};
