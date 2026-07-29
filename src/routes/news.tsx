import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { News } from "@/components/views/News";

export const Route = createFileRoute("/news")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Noticias — Cost Manager" }] }),
  component: () => (
    <AppShell>
      <News />
    </AppShell>
  ),
});
