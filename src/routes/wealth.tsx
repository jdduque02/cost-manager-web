import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { Wealth } from "@/components/views/Wealth";

export const Route = createFileRoute("/wealth")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Wealth — Sprig" }] }),
  component: () => (
    <AppShell>
      <Wealth />
    </AppShell>
  ),
});
