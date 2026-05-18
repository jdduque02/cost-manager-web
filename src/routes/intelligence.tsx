import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { Intelligence } from "@/components/views/Intelligence";

export const Route = createFileRoute("/intelligence")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Intelligence & Taxes — Cost Manager" }] }),
  component: () => (
    <AppShell>
      <Intelligence />
    </AppShell>
  ),
});
