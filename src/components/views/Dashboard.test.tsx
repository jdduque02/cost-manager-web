import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type Highcharts from "highcharts";
import { Dashboard } from "./Dashboard";
import { setLocale } from "@/lib/i18n/errors";

beforeAll(() => setLocale("es"));

let queryClient: QueryClient;
function render(ui: React.ReactElement) {
  queryClient = new QueryClient();
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const kpiState = { loading: false, error: null as Error | null, stale: false };

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: Record<string, unknown>) => (
    <a href={to as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));

const charts: Highcharts.Options[] = [];
const summaryCalls: { date_from: string; group_by?: string }[] = [];
const transactionsCalls: unknown[] = [];

vi.mock("highcharts-react-official", () => ({
  default: ({ options }: { options: Highcharts.Options }) => {
    charts.push(options);
    return null;
  },
}));
vi.mock("@/components/ui/news-carousel", () => ({ NewsCarousel: () => null }));
vi.mock("./TransactionDialog", () => ({ TransactionDialog: () => null }));
vi.mock("@/hooks/use-count-up", () => ({ useCountUp: (v: number) => v }));
vi.mock("@/lib/hooks/use-formatted-amount", () => ({
  useFormattedAmount: () => (v: number) => `$${v}`,
  useAmountsHidden: () => false,
}));

const now = new Date();
const monthKey = (offset: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

vi.mock("@/lib/hooks/use-api", () => ({
  useNetWorth: () => ({
    summary: kpiState.loading || (kpiState.error && !kpiState.stale) ? null : { netWorth: 0 },
    isLoading: kpiState.loading,
    error: kpiState.error,
  }),
  useCategories: () => ({ data: [{ id: 1, name: "Mercado" }] }),
  useTransactions: (params: unknown) => {
    transactionsCalls.push(params);
    return { data: [] };
  },
  useTransactionSummary: (q: { date_from: string; group_by?: string }) => {
    summaryCalls.push(q);
    if (q.group_by === "month") {
      return {
        data: {
          series: [
            { key: monthKey(2), income: 100, expenses: 40 },
            { key: monthKey(0), income: 900, expenses: 300 },
          ],
        },
      };
    }
    return {
      data: {
        totals: { income: 900, expenses: 300, investments: 0, count: 60 },
        by_category: [
          { category_id: 1, income: 0, expenses: 250, investments: 0, count: 50 },
          { category_id: 99, income: 900, expenses: 0, investments: 0, count: 1 },
        ],
      },
    };
  },
}));

describe("Dashboard — datos agregados en servidor", () => {
  beforeEach(() => {
    charts.length = 0;
    summaryCalls.length = 0;
    transactionsCalls.length = 0;
    kpiState.loading = false;
    kpiState.error = null;
    kpiState.stale = false;
  });

  it("shows a skeleton, not $0 KPIs, while loading", () => {
    kpiState.loading = true;
    render(<Dashboard />);
    expect(screen.getByTestId("kpi-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Patrimonio")).not.toBeInTheDocument();
  });

  it("shows an error with a retry that refetches the failed queries", async () => {
    kpiState.error = new Error("boom");
    render(<Dashboard />);
    const spy = vi.spyOn(queryClient, "refetchQueries").mockResolvedValue();
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar tu resumen financiero.");
    expect(screen.queryByText("Patrimonio")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "active" }));
  });

  it("keeps cached KPIs when only a background refetch failed", () => {
    kpiState.error = new Error("boom");
    kpiState.stale = true;
    render(<Dashboard />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Patrimonio")).toBeInTheDocument();
  });

  it("renders the KPIs once loaded and links 'Ver todo' to transactions", () => {
    render(<Dashboard />);
    expect(screen.getByText("Patrimonio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todo" })).toHaveAttribute("href", "/transactions");
  });

  it("builds the 6-month evolution from summary series, filling empty months with 0", () => {
    render(<Dashboard />);
    const evolution = charts.find((o) => o.chart?.type === "area")!;
    const [income, expenses] = evolution.series as { data: number[] }[];
    expect(income.data).toEqual([0, 0, 0, 100, 0, 900]);
    expect(expenses.data).toEqual([0, 0, 0, 40, 0, 300]);
    expect(summaryCalls.some((q) => q.group_by === "month" && q.date_from === monthKey(5))).toBe(
      true,
    );
  });

  it("uses only categories with expenses for the spending breakdown", () => {
    render(<Dashboard />);
    const pie = charts.find((o) => o.chart?.type === "pie")!;
    const [serie] = pie.series as { data: { name: string; y: number }[] }[];
    expect(serie.data.map((p) => [p.name, p.y])).toEqual([["Mercado", 250]]);
  });

  it("requests only the 5 most recent transactions for the activity list", () => {
    render(<Dashboard />);
    expect(transactionsCalls[0]).toEqual({ limit: 5 });
  });
});
