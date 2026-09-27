import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { Settings } from "@/components/views/Settings";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Settings — Sprig" }] }),
  component: () => (
    <AppShell>
      <Settings />
    </AppShell>
  ),
});
