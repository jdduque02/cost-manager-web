import { bankingApi, netWorthDetail } from "./banking";
import type { BankAccount, FinancialAsset, FinancialLiability } from "./banking";
import { fmtDay } from "@/lib/format";
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

describe("bankingApi.computeNetWorth › consolidado en COP (R6.1–R6.4)", () => {
  const trm = {
    value: 4000,
    valid_from: "2026-10-03",
    valid_to: "2026-10-05",
    source: "datos.gov.co",
  };
  const account = (currency: string, display_balance: string) =>
    ({ currency, display_balance }) as unknown as BankAccount;
  const asset = (currency: string, current_value: number) =>
    ({ currency, current_value }) as unknown as FinancialAsset;
  const liability = (currency: string, current_balance: number) =>
    ({ currency, current_balance }) as unknown as FinancialLiability;

  const assets = [asset("USD", 50), asset("EUR", 10)];
  const liabilities = [liability("COP", 200000), liability("USD", 20)];
  const accounts = [account("COP", "1000000"), account("USD", "100.5")];

  it("total = COP + USD × TRM, desglose por moneda (cuentas + activos − pasivos) y EUR fuera del total", () => {
    const nw = bankingApi.computeNetWorth(assets, liabilities, accounts, trm);
    expect(nw.by_currency).toEqual({ COP: 800000, USD: 130.5, EUR: 10 });
    expect(nw.total_cop).toBe(800000 + 130.5 * 4000);
    expect(nw.trm).toBe(trm);
  });

  it("sin TRM y con saldo en USD no hay total: solo el desglose", () => {
    const nw = bankingApi.computeNetWorth(assets, liabilities, accounts, undefined);
    expect(nw.total_cop).toBeNull();
    expect(nw.by_currency.USD).toBe(130.5);
  });

  it("sin USD el total no necesita TRM", () => {
    const nw = bankingApi.computeNetWorth([], [], [account("COP", "5000")], null);
    expect(nw.total_cop).toBe(5000);
  });

  it("totales de activos y pasivos consolidados con la misma regla, cuadran con el patrimonio (R6.9)", () => {
    const nw = bankingApi.computeNetWorth(assets, liabilities, accounts, trm);
    expect(nw.assets.by_currency).toEqual({ COP: 1000000, USD: 150.5, EUR: 10 });
    expect(nw.assets.total_cop).toBe(1000000 + 150.5 * 4000);
    // Pasivos en negativo: el desglose sin TRM conserva el signo, igual que el total.
    expect(nw.liabilities.by_currency).toEqual({ COP: -200000, USD: -20 });
    expect(nw.liabilities.total_cop).toBe(-(200000 + 20 * 4000));
    expect(nw.assets.total_cop! + nw.liabilities.total_cop!).toBe(nw.total_cop);

    const noTrm = bankingApi.computeNetWorth(assets, liabilities, accounts);
    expect(noTrm.assets.total_cop).toBeNull();
    expect(noTrm.liabilities.total_cop).toBeNull();
  });

  it("netWorthDetail arma el desglose y la nota de la TRM; sin total no hay nota", () => {
    const fmt = (n: number, o?: { currency?: string }) => `${o?.currency} ${n}`;
    const withTrm = netWorthDetail(
      bankingApi.computeNetWorth(assets, liabilities, accounts, trm),
      fmt,
    );
    expect(withTrm.breakdown).toBe("COP 800000 · EUR 10 · USD 130.5");
    expect(withTrm.note).toBe(
      `COP 800000 · EUR 10 · USD 130.5 · USD a TRM del ${fmtDay("2026-10-03")}`,
    );

    const noTrm = netWorthDetail(bankingApi.computeNetWorth(assets, liabilities, accounts), fmt);
    expect(noTrm.note).toBeNull();

    // Una moneda que suma 0 no aparece en el desglose.
    const zeroUsd = netWorthDetail(
      bankingApi.computeNetWorth([], [], [account("COP", "5000"), account("USD", "0")], trm),
      fmt,
    );
    expect(zeroUsd.breakdown).toBe("COP 5000");
    expect(zeroUsd.note).toBeNull();

    const copOnly = netWorthDetail(
      bankingApi.computeNetWorth([], [], [account("COP", "5000")]),
      fmt,
    );
    expect(copOnly.note).toBeNull();
  });
});
