import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { TransactionsList } from "@/components/views/TransactionsList";

export const Route = createFileRoute("/transactions")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Transactions — Cost Manager" }] }),
  component: () => (
    <AppShell>
      <TransactionsList />
    </AppShell>
  ),
});
