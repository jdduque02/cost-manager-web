import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { EmailTemplates } from "@/components/views/EmailTemplates";

export const Route = createFileRoute("/emails")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Plantillas de email — Sprig" }] }),
  component: () => (
    <AppShell>
      <EmailTemplates />
    </AppShell>
  ),
});
