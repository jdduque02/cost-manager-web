import { render, screen } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { Reports } from "./Reports";
import { useTransactionSummary } from "@/lib/hooks/use-api";

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
});
