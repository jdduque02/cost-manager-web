import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { Goals } from "@/components/views/Goals";

export const Route = createFileRoute("/goals")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Goals — Cost Manager" }] }),
  component: () => (
    <AppShell>
      <Goals />
    </AppShell>
  ),
});
