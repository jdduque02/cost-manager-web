import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { Intelligence } from "@/components/views/Intelligence";

export const Route = createFileRoute("/intelligence")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Intelligence & Taxes — Sprig" }] }),
  component: () => (
    <AppShell>
      <Intelligence />
    </AppShell>
  ),
});
