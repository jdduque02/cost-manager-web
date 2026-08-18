import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { Logs } from "@/components/views/Logs";

export const Route = createFileRoute("/logs")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Logs — Sprig" }] }),
  component: () => (
    <AppShell requireAdmin>
      <Logs />
    </AppShell>
  ),
});
