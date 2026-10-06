import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { TransactionsList } from "@/components/views/TransactionsList";

export const Route = createFileRoute("/transactions")({
  // Pass-through: los filtros (?from, ?q, ?validate, ?needs_validation...) los lee nuqs en la vista.
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Transactions — Sprig" }] }),
  component: () => (
    <AppShell>
      <TransactionsList />
    </AppShell>
  ),
});
