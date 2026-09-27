import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { TransactionsList } from "@/components/views/TransactionsList";

export const Route = createFileRoute("/transactions")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Transactions — Sprig" }] }),
  component: () => (
    <AppShell>
      <TransactionsList />
    </AppShell>
  ),
});
