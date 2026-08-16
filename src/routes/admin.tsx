import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { AdminUsers } from "@/components/views/AdminUsers";

export const Route = createFileRoute("/admin")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Usuarios (Admin) — Sprig" }] }),
  component: () => (
    <AppShell requireAdmin>
      <AdminUsers />
    </AppShell>
  ),
});
