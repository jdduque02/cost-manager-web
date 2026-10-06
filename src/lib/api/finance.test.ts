import { financeApi } from "./finance";
import { bankingApi } from "./banking";

const mockApi = vi.hoisted(() => ({ get: vi.fn(), getOne: vi.fn() }));

vi.mock("./client", () => ({ api: mockApi }));

describe("financeApi.getTransactions › campos de conversión", () => {
  beforeEach(() => vi.clearAllMocks());

  it("convierte applied_amount y fx_rate (string numérico) a number y deja null sin conversión", async () => {
    mockApi.get.mockResolvedValue([
      {
        id: 1,
        amount: "400000.00",
        currency: "COP",
        applied_amount: "102.24",
        fx_rate: "3912.4700",
      },
      { id: 2, amount: "5000", currency: "COP", applied_amount: null, fx_rate: null },
      { id: 3, amount: "10", currency: "USD" },
    ]);
    const [converted, plain, legacy] = await financeApi.getTransactions("9");
    expect(converted).toMatchObject({ amount: 400000, applied_amount: 102.24, fx_rate: 3912.47 });
    expect(plain).toMatchObject({ applied_amount: null, fx_rate: null });
    expect(legacy).toMatchObject({ amount: 10, applied_amount: null, fx_rate: null });
  });
});

describe("bankingApi.getTrm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pide la TRM de la fecha y convierte value a number", async () => {
    mockApi.getOne.mockResolvedValue({
      value: "3912.47",
      valid_from: "2026-10-03",
      valid_to: "2026-10-05",
      source: "datos.gov.co",
    });
    const trm = await bankingApi.getTrm("2026-10-04");
    expect(mockApi.getOne).toHaveBeenCalledWith("currency/trm?date=2026-10-04");
    expect(trm.value).toBe(3912.47);
  });

  it("sin fecha pide la de hoy (sin query string)", async () => {
    mockApi.getOne.mockResolvedValue({ value: 4000, valid_from: "", valid_to: "", source: "" });
    await bankingApi.getTrm();
    expect(mockApi.getOne).toHaveBeenCalledWith("currency/trm");
  });
});
