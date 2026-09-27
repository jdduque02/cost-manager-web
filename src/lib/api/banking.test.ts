import { bankingApi } from "./banking";
import { statementImportApi } from "./statement-imports";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  getOne: vi.fn(),
  post: vi.fn(),
}));

vi.mock("./client", () => ({ api: mockApi, apiPostForm: vi.fn() }));

// El numeric de Postgres llega como string: la capa API lo convierte a number.
const rawClosure = {
  id: 7,
  product_kind: "liability",
  product_id: 4,
  period_start: "2026-08-16",
  period_end: "2026-09-15",
  currency: "COP",
  expected_balance: "1180000.00",
  reported_balance: "1250000.50",
  difference: "70000.50",
  minimum_payment: "85000",
  total_payment: null,
  status: "reconciled",
  adjustment_tx_id: 812,
};

describe("bankingApi › montos que llegan como string se convierten a number", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getLiabilities convierte current_balance y credit_limit, y deja null el cupo vacío", async () => {
    mockApi.get.mockResolvedValue([
      {
        id: 1,
        liability_type: "tarjeta_credito",
        current_balance: "300000",
        credit_limit: "2000000.00",
      },
      { id: 2, liability_type: "credito_consumo", current_balance: "10", credit_limit: null },
    ]);
    const [card, loan] = await bankingApi.getLiabilities("9");
    expect(card.current_balance).toBe(300000);
    expect(card.credit_limit).toBe(2000000);
    expect(loan.credit_limit).toBeNull();
  });

  it("getProductClosures convierte los montos y respeta los null; arma el query string", async () => {
    mockApi.get.mockResolvedValue([
      rawClosure,
      { ...rawClosure, id: 6, reported_balance: null, difference: null, minimum_payment: null },
    ]);
    const [c, pending] = await bankingApi.getProductClosures("9", {
      product_kind: "liability",
      product_id: 4,
    });
    expect(mockApi.get).toHaveBeenCalledWith(
      "users/9/product-closures?product_kind=liability&product_id=4",
    );
    expect(c).toMatchObject({
      expected_balance: 1180000,
      reported_balance: 1250000.5,
      difference: 70000.5,
      minimum_payment: 85000,
      total_payment: null,
    });
    expect(pending.reported_balance).toBeNull();
    expect(pending.difference).toBeNull();
  });

  it("getProductClosure convierte el detalle", async () => {
    mockApi.getOne.mockResolvedValue(rawClosure);
    const c = await bankingApi.getProductClosure("9", 7);
    expect(mockApi.getOne).toHaveBeenCalledWith("users/9/product-closures/7");
    expect(c.expected_balance).toBe(1180000);
  });

  it("reconcile y skip toman el primer elemento de data y convierten montos", async () => {
    mockApi.post.mockResolvedValue([rawClosure]);
    const dto = { reported_balance: 1250000.5, minimum_payment: 85000 };
    const c = await bankingApi.reconcileProductClosure("9", 7, dto);
    expect(mockApi.post).toHaveBeenCalledWith("users/9/product-closures/7/reconcile", dto);
    expect(c.difference).toBe(70000.5);

    mockApi.post.mockResolvedValue([{ ...rawClosure, status: "skipped", reported_balance: null }]);
    const s = await bankingApi.skipProductClosure("9", 7);
    expect(mockApi.post).toHaveBeenLastCalledWith("users/9/product-closures/7/skip", undefined);
    expect(s.status).toBe("skipped");
    expect(s.expected_balance).toBe(1180000);
  });

  it("statementImportApi.get convierte closing_balance y conserva el periodo", async () => {
    mockApi.getOne.mockResolvedValue({
      id: 3,
      status: "completed",
      files: [
        {
          id: 1,
          closing_balance: "1250000.00",
          period_from: "2026-08-16",
          period_to: "2026-09-15",
        },
        { id: 2, closing_balance: null, period_from: null, period_to: null },
      ],
    });
    const job = await statementImportApi.get("9", 3);
    expect(job.files?.[0]).toMatchObject({
      closing_balance: 1250000,
      period_from: "2026-08-16",
      period_to: "2026-09-15",
    });
    expect(job.files?.[1].closing_balance).toBeNull();
  });
});
