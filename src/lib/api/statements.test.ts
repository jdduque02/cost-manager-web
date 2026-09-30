import { paymentMethodLabel, statementsApi } from "./statements";

const mockApi = vi.hoisted(() => ({ getOne: vi.fn() }));
vi.mock("./client", () => ({ api: mockApi }));

const variance = { change: "10.5", change_pct: null };
const comparison = {
  income: "100",
  expenses: "50",
  investments: "0",
  net: "50",
  variance: { income: variance, expenses: variance, investments: variance, net: variance },
};

describe("statementsApi › numeric como string → number, null se mantiene", () => {
  beforeEach(() => vi.clearAllMocks());

  it("income manda solo year y month y convierte los montos de cada moneda", async () => {
    mockApi.getOne.mockResolvedValue({
      period: { year: 2026, month: 8 },
      by_currency: [
        {
          currency: "COP",
          income: "2500000.00",
          expenses: "1200000",
          investments: "0",
          net: "1300000",
          compare: { previous_month: comparison, same_month_last_year: comparison },
          by_category: [
            {
              category_id: null,
              expenses: "0",
              previous_expenses: "300",
              change_pct: "-100",
              share_pct: null,
              is_relevant: false,
            },
          ],
          fixed: { amount: "800000", share_pct: "66.67" },
          variable: { amount: "400000", share_pct: null },
          by_payment_method: [{ payment_method: null, amount: "1200000" }],
          reconciliation_adjustments: "-5000",
        },
      ],
    });
    const s = await statementsApi.getIncome("9", { year: 2026, month: 8 });

    expect(mockApi.getOne).toHaveBeenCalledWith(
      "users/9/intelligence/statements/income?year=2026&month=8",
    );
    const cop = s.by_currency[0];
    expect(cop).toMatchObject({ income: 2500000, expenses: 1200000, net: 1300000 });
    expect(cop.compare.previous_month.variance.net).toEqual({ change: 10.5, change_pct: null });
    expect(cop.by_category[0]).toMatchObject({
      category_id: null,
      expenses: 0,
      change_pct: -100,
      share_pct: null,
    });
    expect(cop.fixed).toEqual({ amount: 800000, share_pct: 66.67 });
    expect(cop.variable.share_pct).toBeNull();
    expect(cop.by_payment_method[0].amount).toBe(1200000);
    expect(cop.reconciliation_adjustments).toBe(-5000);
  });

  it("balance va sin query y respeta los null de tarjetas sin cupo", async () => {
    mockApi.getOne.mockResolvedValue({
      as_of: "2026-09-29",
      by_currency: [
        {
          currency: "USD",
          assets: { liquid: "10", investable: "0", illiquid: "0", total: "10" },
          liabilities: { short_term: "2", long_term: "0", total: "2" },
          net_worth: "8",
        },
      ],
      credit_cards: [
        {
          liability_id: 1,
          name: "Visa",
          currency: "COP",
          balance: "300000",
          credit_limit: null,
          available: null,
          utilization_pct: null,
          is_high: false,
        },
      ],
      evolution: {
        includes_assets: false,
        points: [{ period_end: "2026-09", currency: "COP", net: "-5" }],
      },
    });
    const b = await statementsApi.getBalance("9");

    expect(mockApi.getOne).toHaveBeenCalledWith("users/9/intelligence/statements/balance");
    expect(b.by_currency[0].net_worth).toBe(8);
    expect(b.by_currency[0].liabilities.short_term).toBe(2);
    expect(b.credit_cards[0]).toMatchObject({
      balance: 300000,
      credit_limit: null,
      available: null,
      utilization_pct: null,
    });
    expect(b.evolution.points[0].net).toBe(-5);
  });

  it("cash-flow y health mandan year/month y conservan los null de los indicadores", async () => {
    mockApi.getOne.mockResolvedValueOnce({
      period: { year: 2025, month: 12 },
      by_currency: [{ currency: "COP", operating: "1", investing: "2", debt: "3", free: "-4" }],
      upcoming_fixed: [
        {
          transaction_id: 5,
          description: null,
          amount: "90000",
          currency: "COP",
          type: "expense",
          due_date: null,
        },
      ],
    });
    const cf = await statementsApi.getCashFlow("9", { year: 2025, month: 12 });
    expect(mockApi.getOne).toHaveBeenLastCalledWith(
      "users/9/intelligence/statements/cash-flow?year=2025&month=12",
    );
    expect(cf.by_currency[0]).toEqual({
      currency: "COP",
      operating: 1,
      investing: 2,
      debt: 3,
      free: -4,
    });
    expect(cf.upcoming_fixed[0]).toMatchObject({ amount: 90000, due_date: null });

    mockApi.getOne.mockResolvedValueOnce({
      period: { year: 2025, month: 12 },
      debt_payment_to_income_pct: null,
      leakage_12m: [{ currency: "COP", amount: "15000" }],
      by_currency: [
        {
          currency: "COP",
          liquidity_ratio: "1.5",
          cushion_months: null,
          avg_debt_rate_pct: "28.4",
          avg_yield_pct: null,
          leverage_pct: "0",
        },
      ],
    });
    const h = await statementsApi.getHealth("9", { year: 2025, month: 12 });
    expect(mockApi.getOne).toHaveBeenLastCalledWith(
      "users/9/intelligence/statements/health?year=2025&month=12",
    );
    expect(h.debt_payment_to_income_pct).toBeNull();
    expect(h.leakage_12m[0].amount).toBe(15000);
    expect(h.by_currency[0]).toEqual({
      currency: "COP",
      liquidity_ratio: 1.5,
      cushion_months: null,
      avg_debt_rate_pct: 28.4,
      avg_yield_pct: null,
      leverage_pct: 0,
    });
  });

  it("paymentMethodLabel: null es «Sin método»", () => {
    expect(paymentMethodLabel(null)).toBe("Sin método");
    expect(paymentMethodLabel("credit_card")).toBe("Tarjeta crédito");
  });
});
