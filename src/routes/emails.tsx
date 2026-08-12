import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { EmailTemplates } from "@/components/views/EmailTemplates";

export const Route = createFileRoute("/emails")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Plantillas de email — Cost Manager" }] }),
  component: () => (
    <AppShell>
      <EmailTemplates />
    </AppShell>
  ),
});
