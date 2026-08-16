import { redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";

export function requireAuth() {
  if (import.meta.env.SSR) return;
  if (!getAccessToken()) {
    throw redirect({ to: "/login" });
  }
}

export function redirectIfAuthenticated() {
  if (import.meta.env.SSR) return;
  if (getAccessToken()) {
    throw redirect({ to: "/dashboard" });
  }
}
