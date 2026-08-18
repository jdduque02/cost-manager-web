import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import { authApi, type AuthTokens } from "@/lib/api/auth";
import {
  getAccessToken,
  clearTokens,
  getStoredUserId,
  setStoredUserId,
  tryRestoreSession,
} from "@/lib/api/client";
import { identityApi, type User } from "@/lib/api/identity";

export interface AuthState {
  user: User | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  roles: string[];
  login: (username: string, password: string) => Promise<AuthTokens>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

function resolveRoles(user: User | null): string[] {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length) return user.roles;
  return [];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function ensureAccessToken(): Promise<{
      token: string | null;
      userId: string | null;
    }> {
      let token = getAccessToken();
      let userId = getStoredUserId();

      if (token) return { token, userId };

      const restored = await tryRestoreSession();
      if (!restored) return { token: null, userId: null };

      return { token: getAccessToken(), userId: getStoredUserId() };
    }

    async function bootstrap() {
      try {
        const { token, userId } = await ensureAccessToken();
        if (!token || !userId) {
          clearTokens();
          return;
        }

        const u = await identityApi.getUser(userId, token);
        if (!cancelled) {
          if (u) {
            setUser(u);
            setStoredUserId(u.id);
          } else {
            clearTokens();
          }
        }
      } catch {
        clearTokens();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
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
    setStoredUserId(u.id);
    return { access_token: result.accessToken, refresh_token: result.refreshToken ?? "" };
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    const id = getStoredUserId() ?? user?.id ?? null;
    if (!token || !id) return;
    const u = await identityApi.getUser(id, token);
    if (u) setUser(u);
  }, [user?.id]);

  const roles = resolveRoles(user);
  const isAdmin = roles.includes("admin");

  const contextValue = useMemo(
    () => ({
      user,
      userId: user?.id ?? null,
      isAuthenticated: !!user,
      isLoading,
      isAdmin,
      roles,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, isAdmin, roles, login, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
