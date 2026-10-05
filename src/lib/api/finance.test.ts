import { financeApi, recurringApi } from "./finance";

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
