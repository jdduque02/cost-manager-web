import { redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";

export function requireAuth({ location }: { location: { href: string } }) {
  if (import.meta.env.SSR) return;
  if (!getAccessToken()) {
    throw redirect({ href: loginHref(location.href) });
  }
}

/**
 * Destino post-login a partir de `?redirect=`: solo rutas internas (empiezan con
 * `/`, no `//` ni `/\`) y sin espacios/controles (el navegador los descarta y
 * `/\t/evil.com` terminaría en `//evil.com`). Cualquier otra cosa → `/dashboard`.
 */
export function safeRedirect(value: string | null | undefined): string {
  return value && /^\/(?![/\\])[^\s\\]*$/.test(value) ? value : "/dashboard";
}

/** URL de login que vuelve a `path` tras autenticarse. */
export function loginHref(path: string): string {
  return `/login?redirect=${encodeURIComponent(path)}`;
}

export function redirectIfAuthenticated() {
  if (import.meta.env.SSR) return;
  if (getAccessToken()) {
    throw redirect({ to: "/dashboard" });
  }
}
