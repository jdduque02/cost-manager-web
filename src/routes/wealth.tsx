import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { Wealth } from "@/components/views/Wealth";

export const Route = createFileRoute("/wealth")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Wealth — Cost Manager" }] }),
  component: () => (
    <AppShell>
      <Wealth />
    </AppShell>
  ),
});
