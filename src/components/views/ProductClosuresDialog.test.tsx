import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProductClosure } from "@/lib/api/banking";
import { setLocale, t } from "@/lib/i18n/errors";
import { PendingClosuresNotice, ProductClosuresDialog } from "./ProductClosuresDialog";

beforeAll(() => setLocale("es"));

const state = vi.hoisted(() => ({
  query: { data: [] as unknown[], isLoading: false, error: null as Error | null, refetch: vi.fn() },
  params: undefined as unknown,
}));

vi.mock("@/lib/hooks/use-formatted-amount", () => ({
  useFormattedAmount: () => (v: number) => `$${v}`,
}));
vi.mock("@/lib/hooks/use-api", () => ({
  useProductClosures: (params: unknown) => {
    state.params = params;
    return state.query;
  },
}));
vi.mock("./ReconcileDialog", () => ({
  ReconcileDialog: ({ closure }: { closure: ProductClosure }) => (
    <div data-testid="reconcile">conciliando {closure.id}</div>
  ),
}));

const base: ProductClosure = {
  id: 1,
  product_kind: "liability",
  product_id: 4,
  period_start: "2026-06-16",
  period_end: "2026-07-15",
  currency: "COP",
  expected_balance: 1000,
  reported_balance: null,
  difference: null,
  minimum_payment: null,
  total_payment: null,
  status: "pending",
  adjustment_tx_id: null,
};

const closures: ProductClosure[] = [
  { ...base, id: 1, period_start: "2026-06-16", period_end: "2026-07-15", status: "skipped" },
  {
    ...base,
    id: 3,
    period_start: "2026-08-16",
    period_end: "2026-09-15",
    status: "pending",
  },
  {
    ...base,
    id: 2,
    period_start: "2026-07-16",
    period_end: "2026-08-15",
    status: "reconciled",
    reported_balance: 1500,
    difference: 500,
    adjustment_tx_id: 812,
  },
];

const product = { kind: "liability" as const, id: 4, name: "Visa" };

describe("ProductClosuresDialog", () => {
  beforeEach(() => {
    state.query = { data: closures, isLoading: false, error: null, refetch: vi.fn() };
  });

  it("pide los cierres del producto y los ordena del más reciente al más antiguo", () => {
    render(<ProductClosuresDialog product={product} onClose={vi.fn()} />);
    expect(state.params).toEqual({ product_kind: "liability", product_id: 4 });
    const items = within(screen.getByRole("list", { name: "Cierres" })).getAllByRole("listitem");
    expect(
      items.map((li) => within(li).getByText(/Por conciliar|Conciliado|Omitido/).textContent),
    ).toEqual(["Por conciliar", "Conciliado", "Omitido"]);
  });

  it("muestra estado, saldo real y diferencia de los conciliados", () => {
    render(<ProductClosuresDialog product={product} onClose={vi.fn()} />);
    const [, reconciled] = screen.getAllByRole("listitem");
    expect(reconciled).toHaveTextContent("Esperado: $1000");
    expect(reconciled).toHaveTextContent("Real: $1500");
    expect(reconciled).toHaveTextContent("Diferencia: $500");
  });

  it.each([
    ["pending", 0, 3, "Conciliar"],
    ["skipped", 2, 1, "Conciliar"],
    ["reconciled", 1, 2, "Volver a conciliar"],
  ])("se abre la conciliación desde %s", async (_status, index, id, label) => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<ProductClosuresDialog product={product} onClose={vi.fn()} />);
    const item = screen.getAllByRole("listitem")[index];
    await user.click(within(item).getByRole("button", { name: label }));
    expect(screen.getByTestId("reconcile")).toHaveTextContent(`conciliando ${id}`);
  });

  it("estado vacío", () => {
    state.query = { ...state.query, data: [] };
    render(<ProductClosuresDialog product={product} onClose={vi.fn()} />);
    expect(screen.getByText(/Aún no hay cierres/)).toBeInTheDocument();
  });

  it("estado de error con reintento", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    state.query = { ...state.query, data: [], error: new Error("x") };
    render(<ProductClosuresDialog product={product} onClose={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(t("err.closure.load"));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(state.query.refetch).toHaveBeenCalled();
  });
});

describe("PendingClosuresNotice", () => {
  it("no se muestra sin pendientes", () => {
    const { container } = render(<PendingClosuresNotice count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [1, "1 cierre por conciliar"],
    [3, "3 cierres por conciliar"],
  ])("con %i pendientes dice «%s»", (count, text) => {
    render(<PendingClosuresNotice count={count} />);
    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
});
