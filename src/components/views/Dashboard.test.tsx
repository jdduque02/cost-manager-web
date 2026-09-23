import { render } from "@testing-library/react";
import type Highcharts from "highcharts";
import { Dashboard } from "./Dashboard";

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
}));

const now = new Date();
const monthKey = (offset: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

vi.mock("@/lib/hooks/use-api", () => ({
  useNetWorth: () => ({ summary: { netWorth: 0 } }),
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
