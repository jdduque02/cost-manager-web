import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, type LoginResult, type AuthTokens } from "@/lib/api/auth";
import { getAccessToken, clearTokens } from "@/lib/api/client";
import { identityApi, type User } from "@/lib/api/identity";

export interface AuthState {
  user: User | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthTokens>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .introspect(token)
      .then((result) => {
        const data = result.data?.[0];
        if (data?.active) {
          if (data.userId !== undefined) {
            return identityApi.getUser(String(data.userId), token);
          }
          if (data.sub) {
            return identityApi.getUser(data.sub, token);
          }
        }
        clearTokens();
        return null;
      })
      .then((u) => {
        if (u) setUser(u);
      })
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login({ username, password });

    if (!result.accessToken) {
      throw new Error("No se recibió token de acceso");
    }

    const introspect = await authApi.introspect(result.accessToken);
    const introspectData = introspect.data?.[0];

    if (!introspectData?.active) {
      throw new Error("Token inválido");
    }

    let userId: string;
    if (introspectData.userId !== undefined) {
      userId = String(introspectData.userId);
    } else if (introspectData.sub) {
      userId = introspectData.sub;
    } else {
      throw new Error("No se pudo obtener el userId");
    }

    const u = await identityApi.getUser(userId, result.accessToken);
    setUser(u);
    return { data: [{ access_token: result.accessToken, refresh_token: result.refreshToken }] };
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id ?? null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
