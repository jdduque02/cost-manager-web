import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { Goals } from "@/components/views/Goals";

export const Route = createFileRoute("/goals")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Goals — Sprig" }] }),
  component: () => (
    <AppShell>
      <Goals />
    </AppShell>
  ),
});
