import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { Reports } from "@/components/views/Reports";

export const Route = createFileRoute("/reports")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Reportes — Sprig" }] }),
  component: () => (
    <AppShell>
      <Reports />
    </AppShell>
  ),
});
