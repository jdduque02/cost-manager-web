import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, type AuthTokens } from "@/lib/api/auth";
import { getAccessToken, clearTokens, getStoredUserId } from "@/lib/api/client";
import { identityApi, type User } from "@/lib/api/identity";

export interface AuthState {
  user: User | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthTokens>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    const userId = getStoredUserId();
    if (!token || !userId) {
      clearTokens();
      setIsLoading(false);
      return;
    }

    identityApi
      .getUser(userId, token)
      .then((u) => {
        if (u) setUser(u);
        else clearTokens();
      })
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login({ username, password });

    if (!result.accessToken) {
      throw new Error("No se recibio token de acceso");
    }

    if (!result.userId) {
      throw new Error("No se pudo obtener el userId");
    }

    const u = await identityApi.getUser(String(result.userId), result.accessToken);
    setUser(u);
    return { access_token: result.accessToken, refresh_token: result.refreshToken };
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    const id = getStoredUserId();
    if (!token || !id) return;
    const u = await identityApi.getUser(id, token);
    if (u) setUser(u);
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
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
