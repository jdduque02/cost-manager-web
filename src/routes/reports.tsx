import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { Reports } from "@/components/views/Reports";

export const Route = createFileRoute("/reports")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Reportes — Cost Manager" }] }),
  component: () => (
    <AppShell>
      <Reports />
    </AppShell>
  ),
});
