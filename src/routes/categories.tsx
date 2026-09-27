import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { Categories } from "@/components/views/Categories";

export const Route = createFileRoute("/categories")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Categorías — Sprig" }] }),
  component: () => (
    <AppShell>
      <Categories />
    </AppShell>
  ),
});
