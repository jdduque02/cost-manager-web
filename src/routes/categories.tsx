import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { Categories } from "@/components/views/Categories";

export const Route = createFileRoute("/categories")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Categorías — Cost Manager" }] }),
  component: () => (
    <AppShell>
      <Categories />
    </AppShell>
  ),
});
