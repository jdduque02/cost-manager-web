import { groupByMonth, monthCurrencies } from "./TransactionsList";
import type { TransactionRecord } from "@/lib/api/finance";

function tx(overrides: Partial<TransactionRecord>): TransactionRecord {
  return {
    id: overrides.id ?? Math.random(),
    user_id: 1,
    category_id: null,
    category_status: "categorized",
    type: "expense",
    amount: 0,
    currency: "COP",
    is_fixed: false,
    transaction_date: "2026-01-15",
    created_at: "2026-01-15T00:00:00Z",
    updated_at: null,
    ...overrides,
  };
}

describe("groupByMonth (currency-aware totals)", () => {
  it("does not mix COP and USD amounts in the same month total", () => {
    const items = [
      tx({ id: 1, type: "expense", amount: 100_000, currency: "COP" }),
      tx({ id: 2, type: "expense", amount: 50, currency: "USD" }),
      tx({ id: 3, type: "income", amount: 200_000, currency: "COP" }),
      tx({ id: 4, type: "income", amount: 10, currency: "USD" }),
    ];

    const [month] = groupByMonth(items);

    expect(month.expensesByCurrency).toEqual({ COP: 100_000, USD: 50 });
    expect(month.incomeByCurrency).toEqual({ COP: 200_000, USD: 10 });
  });

  it("aggregates multiple transactions of the same currency together", () => {
    const items = [
      tx({ id: 1, type: "expense", amount: 30_000, currency: "COP" }),
      tx({ id: 2, type: "expense", amount: 20_000, currency: "COP" }),
    ];

    const [month] = groupByMonth(items);

    expect(month.expensesByCurrency).toEqual({ COP: 50_000 });
  });

  it("defaults to COP when currency is missing", () => {
    const items = [tx({ id: 1, type: "income", amount: 1000, currency: "" })];

    const [month] = groupByMonth(items);

    expect(month.incomeByCurrency).toEqual({ COP: 1000 });
  });

  it("groups items into separate months by transaction_date", () => {
    const items = [
      tx({ id: 1, transaction_date: "2026-01-05", amount: 10, type: "income" }),
      tx({ id: 2, transaction_date: "2026-02-05", amount: 20, type: "income" }),
    ];

    const months = groupByMonth(items);

    expect(months).toHaveLength(2);
    expect(months.map((m) => m.key)).toEqual(["2026-02", "2026-01"]);
  });
});

describe("monthCurrencies", () => {
  it("returns the sorted union of income and expense currencies", () => {
    const [month] = groupByMonth([
      tx({ id: 1, type: "expense", amount: 1, currency: "USD" }),
      tx({ id: 2, type: "income", amount: 1, currency: "COP" }),
    ]);

    expect(monthCurrencies(month)).toEqual(["COP", "USD"]);
  });

  it("returns a single currency when only one is present", () => {
    const [month] = groupByMonth([tx({ id: 1, type: "expense", amount: 1, currency: "COP" })]);

    expect(monthCurrencies(month)).toEqual(["COP"]);
  });
});
