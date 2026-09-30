import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { Reports } from "./Reports";
import { useTransactionSummary } from "@/lib/hooks/use-api";

vi.mock("./FinancialStatements", () => ({
  FinancialStatements: () => <div data-testid="financial-statements" />,
}));
vi.mock("highcharts-react-official", () => ({ default: () => null }));
vi.mock("@/lib/hooks/use-formatted-amount", () => ({
  useFormattedAmount: () => (v: number, o?: { currency?: string }) =>
    `${o?.currency ?? "COP"} ${v}`,
  useAmountsHidden: () => false,
}));
vi.mock("@/lib/hooks/use-api", () => ({
  useTransactionSummary: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
  useCategories: () => ({ data: [] }),
}));

describe("Reports", () => {
  it("pide el resumen solo en COP: el API sumaba todas las monedas sin el filtro", () => {
    render(<Reports />, { wrapper: withNuqsTestingAdapter() });
    expect(vi.mocked(useTransactionSummary)).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "COP" }),
    );
  });

  it("muestra los USD del periodo aparte, sin sumarlos a los KPIs en COP", () => {
    vi.mocked(useTransactionSummary).mockImplementation(
      (q) =>
        ({
          data: {
            totals:
              q.currency === "USD"
                ? { income: 80, expenses: 20, investments: 0, count: 2 }
                : { income: 1000, expenses: 300, investments: 0, count: 5 },
            by_category: [],
            series: [],
          },
          isLoading: false,
          error: null,
        }) as never,
    );
    render(<Reports />, { wrapper: withNuqsTestingAdapter() });

    const usd = screen.getByTestId("usd-period");
    expect(usd).toHaveTextContent("USD 80");
    expect(usd).toHaveTextContent("USD 20");
    expect(screen.getByText("COP 1000")).toBeInTheDocument();
  });

  it("llama «Sin clasificar» al grupo sin categoría (category_id 0) del desglose (R6.7)", () => {
    vi.mocked(useTransactionSummary).mockImplementation(
      () =>
        ({
          data: {
            totals: { income: 0, expenses: 300, investments: 0, count: 2 },
            by_category: [{ category_id: 0, income: 0, expenses: 300, investments: 0, count: 2 }],
            series: [],
          },
          isLoading: false,
          error: null,
        }) as never,
    );
    render(<Reports />, { wrapper: withNuqsTestingAdapter() });
    expect(screen.getByText("Sin clasificar")).toBeInTheDocument();
    expect(screen.queryByText("Categoría 0")).not.toBeInTheDocument();
  });

  it("abre por defecto la pestaña «Movimientos» con lo de siempre y sin montar los estados", () => {
    render(<Reports />, { wrapper: withNuqsTestingAdapter() });
    expect(screen.getByRole("tab", { name: "Movimientos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Gastos por categoría")).toBeInTheDocument();
    expect(screen.queryByTestId("financial-statements")).not.toBeInTheDocument();
  });

  it("al cambiar a «Estados financieros» monta FinancialStatements y desmonta Movimientos", async () => {
    render(<Reports />, { wrapper: withNuqsTestingAdapter() });
    await userEvent.click(screen.getByRole("tab", { name: "Estados financieros" }));
    expect(screen.getByTestId("financial-statements")).toBeInTheDocument();
    expect(screen.queryByText("Gastos por categoría")).not.toBeInTheDocument();
  });
});
