import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { Settings } from "@/components/views/Settings";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Settings — Cost Manager" }] }),
  component: () => (
    <AppShell>
      <Settings />
    </AppShell>
  ),
});

