import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { NewsAdmin } from "@/components/views/NewsAdmin";

export const Route = createFileRoute("/news")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Noticias — Sprig" }] }),
  component: () => (
    <AppShell requireAdmin>
      <NewsAdmin />
    </AppShell>
  ),
});
