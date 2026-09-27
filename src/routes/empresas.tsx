import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { Empresas } from "@/components/views/Empresas";

export const Route = createFileRoute("/empresas")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Empresas — Sprig" }] }),
  component: () => (
    <AppShell>
      <Empresas />
    </AppShell>
  ),
});
