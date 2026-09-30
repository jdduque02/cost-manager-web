import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { FinancialStatements } from "./FinancialStatements";
import { VisibilityProvider } from "@/lib/visibility-context";
import { HIDE_AMOUNTS_KEY, MASKED } from "@/lib/format";
import { useCashFlowStatement, useIncomeStatement } from "@/lib/hooks/use-api";
import type {
  CashFlowStatement,
  IncomeComparison,
  IncomeCurrencyStatement,
} from "@/lib/api/statements";

vi.mock("@/lib/hooks/use-api", () => ({
  useIncomeStatement: vi.fn(),
  useCashFlowStatement: vi.fn(),
  useCategories: () => ({ data: [{ id: 3, name: "Mercado" }] }),
}));

const ok = <T,>(data: T) => ({ data, isLoading: false, error: null, refetch: vi.fn() }) as never;
const failed = (msg: string) =>
  ({ data: undefined, isLoading: false, error: new Error(msg), refetch: vi.fn() }) as never;

const v = (change_pct: number | null) => ({ change: 0, change_pct });
const comparison = (pct: number | null): IncomeComparison => ({
  income: 0,
  expenses: 0,
  investments: 0,
  net: 0,
  variance: { income: v(pct), expenses: v(pct), investments: v(pct), net: v(pct) },
});

function incomeBlock(currency: string, over: Partial<IncomeCurrencyStatement> = {}) {
  return {
    currency,
    income: 1000,
    expenses: 400,
    investments: 100,
    net: 500,
    compare: { previous_month: comparison(12.5), same_month_last_year: comparison(null) },
    by_category: [],
    fixed: { amount: 300, share_pct: 75 },
    variable: { amount: 100, share_pct: 25 },
    by_payment_method: [],
    reconciliation_adjustments: 0,
    ...over,
  } satisfies IncomeCurrencyStatement;
}

const cashFlow: CashFlowStatement = {
  period: { year: 2026, month: 8 },
  by_currency: [{ currency: "COP", operating: 600, investing: 100, debt: 50, free: 450 }],
  upcoming_fixed: [
    {
      transaction_id: 1,
      description: "Arriendo",
      amount: 1500000,
      currency: "COP",
      type: "expense",
      due_date: null,
    },
  ],
};

function setup(income: unknown, flow: unknown = ok(cashFlow), search = "?month=2026-08") {
  vi.mocked(useIncomeStatement).mockReturnValue(income as never);
  vi.mocked(useCashFlowStatement).mockReturnValue(flow as never);
  const Nuqs = withNuqsTestingAdapter({ searchParams: search });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Nuqs>
      <VisibilityProvider>{children}</VisibilityProvider>
    </Nuqs>
  );
  return render(<FinancialStatements />, { wrapper });
}

describe("FinancialStatements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("toma el mes de ?month= y pide al API year/month; el botón mueve al mes anterior", async () => {
    setup(ok({ period: { year: 2026, month: 8 }, by_currency: [] }));
    expect(useIncomeStatement).toHaveBeenLastCalledWith({ year: 2026, month: 8 });
    expect(useCashFlowStatement).toHaveBeenLastCalledWith({ year: 2026, month: 8 });

    await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(useIncomeStatement).toHaveBeenLastCalledWith({ year: 2026, month: 7 });
  });

  it("muestra un bloque por moneda, sin sumarlas", () => {
    setup(
      ok({
        period: { year: 2026, month: 8 },
        by_currency: [incomeBlock("COP"), incomeBlock("USD")],
      }),
    );
    const card = screen.getByTestId("income-card");
    expect(within(card).getByTestId("currency-block-COP")).toBeInTheDocument();
    expect(within(card).getByTestId("currency-block-USD")).toBeInTheDocument();
    expect(within(card).getByTestId("currency-block-USD")).toHaveTextContent("US$");
  });

  it("resalta la variación relevante con ▲ y signo +; la no relevante va sin resaltar", () => {
    setup(
      ok({
        period: { year: 2026, month: 8 },
        by_currency: [
          incomeBlock("COP", {
            by_category: [
              {
                category_id: 3,
                expenses: 400,
                previous_expenses: 296,
                change_pct: 35,
                share_pct: 80,
                is_relevant: true,
              },
              // Solo gastó el mes anterior: se muestra, sin resaltar.
              {
                category_id: null,
                expenses: 0,
                previous_expenses: 50,
                change_pct: -100,
                share_pct: 0,
                is_relevant: false,
              },
            ],
          }),
        ],
      }),
    );
    const relevant = screen.getByText("Mercado").closest("tr")!;
    expect(relevant).toHaveAttribute("data-relevant", "true");
    expect(relevant).toHaveTextContent("Relevante");
    expect(relevant).toHaveTextContent(/▲\s*\+35\s?%/);

    const gone = screen.getByText("Sin clasificar").closest("tr")!;
    expect(gone).not.toHaveAttribute("data-relevant");
    expect(gone).toHaveTextContent(/▼\s*-100\s?%/);
  });

  it("un indicador null se muestra como «sin datos», nunca 0", () => {
    setup(
      ok({
        period: { year: 2026, month: 8 },
        by_currency: [
          incomeBlock("COP", {
            variable: { amount: 0, share_pct: null },
            by_category: [
              {
                category_id: 3,
                expenses: 400,
                previous_expenses: 0,
                change_pct: null,
                share_pct: null,
                is_relevant: false,
              },
            ],
          }),
        ],
      }),
    );
    const row = screen.getByText("Mercado").closest("tr")!;
    expect(within(row).getAllByText("sin datos")).toHaveLength(2);
    // same_month_last_year viene sin base: cada total dice "sin datos".
    expect(
      within(screen.getByTestId("income-card")).getAllByText("sin datos").length,
    ).toBeGreaterThan(4);
    expect(row).not.toHaveTextContent("0 %");
  });

  it("un endpoint en error muestra su error y no oculta las otras tarjetas", () => {
    setup(failed("Error del servidor"));
    const income = screen.getByTestId("income-card");
    expect(within(income).getByRole("alert")).toHaveTextContent("Error del servidor");
    expect(within(income).getByRole("button", { name: "Reintentar" })).toBeInTheDocument();

    const flow = screen.getByTestId("cash-flow-card");
    expect(within(flow).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(flow).getByText("Flujo libre")).toBeInTheDocument();
    expect(within(flow).getByText("Arriendo")).toBeInTheDocument();
    expect(within(flow).getByText("Calculado a hoy")).toBeInTheDocument();
  });

  it("muestra un skeleton por tarjeta mientras carga", () => {
    setup({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    expect(screen.getByTestId("income-card-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("cash-flow-card-loading")).not.toBeInTheDocument();
  });

  it("con «Ocultar montos» activo, los montos salen enmascarados", async () => {
    localStorage.setItem(HIDE_AMOUNTS_KEY, "1");
    setup(ok({ period: { year: 2026, month: 8 }, by_currency: [incomeBlock("COP")] }));
    const flow = screen.getByTestId("cash-flow-card");
    expect(await within(flow).findAllByText(MASKED)).not.toHaveLength(0);
    expect(flow).not.toHaveTextContent("$");
    expect(screen.getByTestId("income-card")).not.toHaveTextContent("$");
  });
});
