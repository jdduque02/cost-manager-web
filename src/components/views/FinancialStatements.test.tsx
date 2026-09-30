import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { FinancialStatements } from "./FinancialStatements";
import { VisibilityProvider } from "@/lib/visibility-context";
import { HIDE_AMOUNTS_KEY, MASKED } from "@/lib/format";
import {
  useBalanceSheet,
  useCashFlowStatement,
  useFinancialHealth,
  useIncomeStatement,
} from "@/lib/hooks/use-api";
import type {
  BalanceSheet,
  CashFlowStatement,
  FinancialHealth,
  IncomeComparison,
  IncomeCurrencyStatement,
} from "@/lib/api/statements";

vi.mock("highcharts-react-official", () => ({
  default: () => <div data-testid="highcharts" />,
}));
vi.mock("@/lib/hooks/use-api", () => ({
  useIncomeStatement: vi.fn(),
  useCashFlowStatement: vi.fn(),
  useBalanceSheet: vi.fn(),
  useFinancialHealth: vi.fn(),
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

const balance: BalanceSheet = {
  as_of: "2026-09-29",
  by_currency: [
    {
      currency: "COP",
      assets: { liquid: 100, investable: 50, illiquid: 0, total: 150 },
      liabilities: { short_term: 40, long_term: 0, total: 40 },
      net_worth: 110,
    },
  ],
  credit_cards: [
    {
      liability_id: 1,
      name: "Visa Oro",
      currency: "COP",
      balance: 850000,
      credit_limit: 1000000,
      available: 150000,
      utilization_pct: 85,
      is_high: true,
    },
    {
      liability_id: 2,
      name: "Master sin cupo",
      currency: "COP",
      balance: 20000,
      credit_limit: null,
      available: null,
      utilization_pct: null,
      is_high: false,
    },
  ],
  evolution: {
    includes_assets: false,
    points: [
      { period_end: "2026-09", currency: "COP", net: -5 },
      { period_end: "2026-08", currency: "USD", net: 10 },
      { period_end: "2026-09", currency: "USD", net: 12 },
    ],
  },
};

const health: FinancialHealth = {
  period: { year: 2026, month: 8 },
  debt_payment_to_income_pct: 18.5,
  leakage_12m: [{ currency: "COP", amount: 0 }],
  by_currency: [
    {
      currency: "COP",
      liquidity_ratio: 1.5,
      cushion_months: null,
      avg_debt_rate_pct: 28.4,
      avg_yield_pct: null,
      leverage_pct: 26.7,
    },
  ],
};

function setup(
  income: unknown,
  {
    flow = ok(cashFlow),
    sheet = ok(balance),
    ind = ok(health),
    search = "?month=2026-08",
  }: Record<string, unknown> = {},
) {
  vi.mocked(useIncomeStatement).mockReturnValue(income as never);
  vi.mocked(useCashFlowStatement).mockReturnValue(flow as never);
  vi.mocked(useBalanceSheet).mockReturnValue(sheet as never);
  vi.mocked(useFinancialHealth).mockReturnValue(ind as never);
  const Nuqs = withNuqsTestingAdapter({ searchParams: search as string });
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

  it("un año fuera de 2000–2100 (400 en el API) cae al mes actual; no se retrocede antes de 2000-01", () => {
    const now = new Date();
    const empty = ok({ period: { year: 2026, month: 8 }, by_currency: [] });
    const { unmount } = setup(empty, { search: "?month=1999-12" });
    expect(useIncomeStatement).toHaveBeenLastCalledWith({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
    unmount();

    setup(empty, { search: "?month=2000-01" });
    expect(useIncomeStatement).toHaveBeenLastCalledWith({ year: 2000, month: 1 });
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled();
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
    expect(within(screen.getByTestId("balance-card")).getByText("Visa Oro")).toBeInTheDocument();
    expect(within(screen.getByTestId("health-card")).queryByRole("alert")).not.toBeInTheDocument();
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
    expect(screen.getByTestId("balance-card")).not.toHaveTextContent("$");
  });

  it("resalta la tarjeta de crédito con uso alto; la que no tiene cupo no muestra %", () => {
    setup(ok({ period: { year: 2026, month: 8 }, by_currency: [] }));
    const high = screen.getByTestId("credit-card-1");
    expect(high).toHaveAttribute("data-high", "true");
    expect(high).toHaveTextContent("Uso alto");
    expect(high).toHaveTextContent(/85\s?% del cupo/);

    const noLimit = screen.getByTestId("credit-card-2");
    expect(noLimit).not.toHaveAttribute("data-high");
    expect(noLimit).toHaveTextContent("sin cupo registrado");
    expect(noLimit).not.toHaveTextContent("%");
  });

  it("evolución: una línea por moneda, aviso de activos y de menos de 2 cierres", () => {
    setup(ok({ period: { year: 2026, month: 8 }, by_currency: [] }));
    const card = screen.getByTestId("balance-card");
    expect(card).toHaveTextContent("no incluye activos");
    expect(
      within(screen.getByTestId("evolution-COP")).getByText(/se llena con cada cierre/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("evolution-COP")).queryByTestId("highcharts"),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("evolution-USD")).getByTestId("highcharts"),
    ).toBeInTheDocument();
    expect(card).toHaveTextContent(/Calculado a hoy \(29 /);
  });

  it("indicadores: R4.1 como «Cuotas de deuda / ingreso», unidades y «sin datos»; sin debt_ratio", () => {
    setup(ok({ period: { year: 2026, month: 8 }, by_currency: [] }));
    const card = screen.getByTestId("health-card");
    expect(within(card).getByText(/Cuotas de deuda \/ ingreso/)).toBeInTheDocument();
    expect(card).toHaveTextContent(/18,5\s?%/);
    expect(card).toHaveTextContent("1,5 veces");
    expect(card).toHaveTextContent(/28,4\s?% anual/);
    expect(card).toHaveTextContent("Calculado a hoy");
    expect(within(card).getAllByText("sin datos")).toHaveLength(2);
    expect(card).not.toHaveTextContent(/Deuda total|debt_ratio/i);
    // Fuga en 0: no se muestra la línea de plata sin registrar.
    expect(card).not.toHaveTextContent("sin registrar");
  });

  it("indicador R4.1 null → «sin datos»", () => {
    setup(ok({ period: { year: 2026, month: 8 }, by_currency: [] }), {
      ind: ok({ ...health, debt_payment_to_income_pct: null, by_currency: [] }),
    });
    const card = screen.getByTestId("health-card");
    expect(
      within(card).getByText("Cuotas de deuda / ingreso (COP, mes seleccionado)").nextSibling,
    ).toHaveTextContent("sin datos");
  });
});
