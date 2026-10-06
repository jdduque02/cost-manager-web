import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VisibilityProvider } from "@/lib/visibility-context";
import { fmtCurrency } from "@/lib/format";
import type { RecurringTransaction } from "@/lib/api/finance";
import { RecurringPage } from "./recurring";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children }: { children?: React.ReactNode }) => <a href="/transactions">{children}</a>,
}));
vi.mock("@/components/layout/AppShell", () => ({ AppShell: () => null }));
vi.mock("@/components/views/RecurringDialog", async (orig) => ({
  ...(await orig<typeof import("@/components/views/RecurringDialog")>()),
  RecurringDialog: () => null,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ userId: "u1" }) }));

const mockList = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/finance", () => ({ recurringApi: { list: mockList, cancel: vi.fn() } }));

const debt: RecurringTransaction = {
  id: 7,
  name: "Cuota carro",
  type: "transfer",
  amount: 850000,
  currency: "COP",
  category_id: null,
  subcategory_id: null,
  account_id: null,
  liability_id: null,
  origin_account_id: 1,
  destination_account_id: null,
  destination_liability_id: 9,
  payment_method: null,
  frequency: "monthly",
  start_date: "2026-07-05",
  next_due_date: "2026-10-05",
  end_date: null,
  max_occurrences: 12,
  occurrences_count: 3,
  remaining_occurrences: 9,
  mode: "confirm",
  reminder_days: 1,
  status: "active",
  pending_validation_count: 2,
  created_at: "2026-07-01",
};

describe("RecurringPage", () => {
  it('muestra "3 de 12 cuotas" y el monto con fmtCurrency', async () => {
    mockList.mockResolvedValue([debt]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <VisibilityProvider>
          <RecurringPage />
        </VisibilityProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/3 de 12 cuotas/)).toBeInTheDocument();
    expect(screen.getByText(fmtCurrency(850000, "COP").replace(/\s/g, " "))).toBeInTheDocument();
    expect(screen.getByText("2 por validar")).toBeInTheDocument();
    expect(screen.getByText(/Pago de deuda/)).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith("u1", "active");
  });
});
