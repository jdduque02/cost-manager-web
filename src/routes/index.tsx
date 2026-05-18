import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/components/views/Dashboard";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});
