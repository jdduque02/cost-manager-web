import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/components/views/Dashboard";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Panel — Sprig" }] }),
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});
