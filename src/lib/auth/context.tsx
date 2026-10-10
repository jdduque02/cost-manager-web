import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { authApi, type AuthTokens } from "@/lib/api/auth";
import {
  getAccessToken,
  clearTokens,
  getStoredUserId,
  setStoredUserId,
  tryRestoreSession,
  onSessionExpired,
  resetSessionExpiredFlag,
  hasStoredSession,
  ApiError,
} from "@/lib/api/client";
import { identityApi, type User } from "@/lib/api/identity";
import { loginHref } from "@/lib/auth/guards";

import { t } from "@/lib/i18n/errors";
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
  /** Reemplaza el usuario de la sesión con uno ya obtenido del API (sin otra petición). */
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthState | null>(null);

/** Lo emite setTokens (client.ts) al guardar un access token nuevo. */
const TOKENS_UPDATED = "cm:tokens-updated";

/** 429/5xx o fallo de red: la sesión puede seguir viva. */
const isTransient = (err: unknown) =>
  !(err instanceof ApiError) || err.status === 429 || err.status >= 500;

function resolveRoles(user: User | null): string[] {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length) return user.roles;
  return [];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    resetSessionExpiredFlag();
    const unsubscribe = onSessionExpired(() => {
      setUser(null);
      toast.error(t("err.session.expiredTitle"), {
        description: t("err.session.expiredDesc"),
        duration: 5000,
      });
      // Redirect to login after a short delay, volviendo luego a donde estaba
      setTimeout(() => {
        window.location.href = loginHref(window.location.pathname + window.location.search);
      }, 1500);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    /** null = no se pudo restaurar; tryRestoreSession ya decidió si limpiar la marca. */
    async function ensureAccessToken(): Promise<{
      token: string | null;
      userId: string | null;
    } | null> {
      const token = getAccessToken();
      const userId = getStoredUserId();

      if (token) return { token, userId };

      const restored = await tryRestoreSession();
      if (!restored) return null;

      return { token: getAccessToken(), userId: getStoredUserId() };
    }

    /** true si quedó un usuario cargado. */
    async function bootstrap(): Promise<boolean> {
      try {
        const session = await ensureAccessToken();
        // Sin clearTokens: ante 429/5xx/red la marca de sesión debe sobrevivir al reload.
        if (!session) return false;
        const { token, userId } = session;
        if (!token || !userId) {
          clearTokens();
          return false;
        }

        const u = await identityApi.getUser(userId, token);
        if (cancelled) return false;
        if (!u) {
          clearTokens();
          return false;
        }
        setUser(u);
        setStoredUserId(u.id);
        return true;
      } catch (err) {
        // 429/5xx/red: el token sale de memoria (AppShell lleva a login) pero la marca queda.
        clearTokens({ keepSessionMarker: isTransient(err) });
        return false;
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    // Con la marca viva, el beforeLoad de __root reintenta el restore en cada navegación;
    // cuando lo logre (setTokens emite cm:tokens-updated), cargar el usuario.
    async function run() {
      if (await bootstrap()) return;
      if (!cancelled && hasStoredSession()) {
        window.addEventListener(TOKENS_UPDATED, run, { once: true });
      }
    }

    void run();
    return () => {
      cancelled = true;
      window.removeEventListener(TOKENS_UPDATED, run);
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

  // authApi.logout ya limpia los tokens en su finally; si auth/logout falla
  // (red caída, 5xx) igual cerramos la sesión local para no dejar al usuario atrapado.
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignorado a propósito: la sesión local se cierra de todas formas
    } finally {
      setUser(null);
    }
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
      updateUser: setUser,
    }),
    [user, isLoading, isAdmin, roles, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
