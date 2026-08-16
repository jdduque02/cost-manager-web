import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { News } from "@/components/views/News";

export const Route = createFileRoute("/news")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Noticias — Sprig" }] }),
  component: () => (
    <AppShell>
      <News />
    </AppShell>
  ),
});
