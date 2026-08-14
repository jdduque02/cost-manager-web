import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { AdminUsers } from "@/components/views/AdminUsers";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Usuarios (Admin) — Cost Manager" }] }),
  component: () => (
    <AppShell requireAdmin>
      <AdminUsers />
    </AppShell>
  ),
});
