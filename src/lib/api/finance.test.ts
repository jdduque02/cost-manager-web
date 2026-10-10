import { financeApi, recurringApi } from "./finance";
import { bankingApi } from "./banking";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  getOne: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("./client", () => ({ api: mockApi }));

// bigint y numeric de Postgres llegan como string.
const rawTx = { id: "40", amount: "1520000.00", recurring_id: "7", needs_validation: false };

describe("recurringApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("desenvuelve la respuesta del interceptor (data siempre es arreglo)", async () => {
    mockApi.post.mockResolvedValueOnce([{ id: 7, name: "Arriendo" }]);
    await expect(recurringApi.create("1", {} as never)).resolves.toEqual({
      id: 7,
      name: "Arriendo",
    });

    mockApi.post.mockResolvedValueOnce([{ created: 2, reminders: 1, adopted: 0 }]);
    await expect(recurringApi.process("1")).resolves.toEqual({
      created: 2,
      reminders: 1,
      adopted: 0,
    });
    expect(mockApi.post).toHaveBeenLastCalledWith("users/1/recurring-transactions/process", {});
  });

  it("validate envía transaction_date y normaliza la transacción cruda", async () => {
    mockApi.post.mockResolvedValue([rawTx]);
    const tx = await recurringApi.validate("1", 40, { transaction_date: "2026-10-04" });

    expect(mockApi.post).toHaveBeenCalledWith("users/1/recurring-transactions/validate/40", {
      transaction_date: "2026-10-04",
    });
    expect(tx.amount).toBe(1520000);
    expect(tx.recurring_id).toBe(7);
  });

  it("list solo envía status si viene", async () => {
    mockApi.get.mockResolvedValue([]);
    await recurringApi.list("1");
    await recurringApi.list("1", "active");
    expect(mockApi.get.mock.calls.map((c) => c[0])).toEqual([
      "users/1/recurring-transactions",
      "users/1/recurring-transactions?status=active",
    ]);
  });
});

describe("financeApi.getTransactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pasa needs_validation y convierte recurring_id a number (null si no hay)", async () => {
    mockApi.get.mockResolvedValue([rawTx, { ...rawTx, recurring_id: null }]);
    const txs = await financeApi.getTransactions("1", { needs_validation: true });

    expect(mockApi.get).toHaveBeenCalledWith("users/1/transactions?needs_validation=true");
    expect(txs.map((t) => t.recurring_id)).toEqual([7, null]);
  });
});

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

describe("financeApi.convertToTransfer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hace POST a la ruta de conversión con el CreateTransferDto", async () => {
    mockApi.post.mockResolvedValue([{ transfer_group_id: "g" }]);
    const dto = { source_account_id: 1, destination_account_id: 2, amount: 750000 };
    await financeApi.convertToTransfer("9", "40", dto);
    expect(mockApi.post).toHaveBeenCalledWith("users/9/transactions/40/convert-to-transfer", dto);
  });
});
