import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { TransactionsList } from "./TransactionsList";
import { setLocale } from "@/lib/i18n/errors";
import type { TransactionRecord } from "@/lib/api/finance";

beforeAll(() => setLocale("es"));

const state = vi.hoisted(() => ({
  transactions: [] as unknown[],
  bankAccounts: [] as unknown[],
  error: null as Error | null,
  refetch: vi.fn(),
}));

vi.mock("./TransactionDialog", () => ({
  TransactionDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog" /> : null),
}));
vi.mock("./TransferDialog", () => ({ TransferDialog: () => null }));
vi.mock("./TransactionCalendar", () => ({ TransactionCalendar: () => null }));
vi.mock("./CurrencyConverter", () => ({ CurrencyConverter: () => null }));
vi.mock("./GmfCalculator", () => ({ GmfCalculator: () => null }));
vi.mock("./StatementImportDialog", () => ({ StatementImportDialog: () => null }));
vi.mock("@/lib/hooks/use-formatted-amount", () => ({
  useFormattedAmount: () => (v: number) => `$${v}`,
}));

vi.mock("@/lib/hooks/use-api", () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  const empty = () => ({ data: [] });
  return {
    useTransactions: () => ({
      data: state.transactions,
      isLoading: false,
      error: state.error,
      refetch: state.refetch,
    }),
    useCategories: () => ({ data: [{ id: 1, name: "Mercado" }] }),
    useObjectives: empty,
    useBankAccounts: () => ({ data: state.bankAccounts }),
    useFinancialAssets: empty,
    useFinancialLiabilities: empty,
    useEmpresas: empty,
    useDeleteTransaction: mutation,
    useDeleteTransfer: mutation,
    useBulkDeleteTransactions: mutation,
    useCloneTransaction: mutation,
    useCloneTransfer: mutation,
  };
});

function tx(id: number, description = `Compra ${id}`): TransactionRecord {
  return {
    id,
    user_id: 1,
    category_id: 1,
    category_status: "categorized",
    type: "expense",
    amount: 1000,
    currency: "COP",
    is_fixed: false,
    description,
    transaction_date: "2026-09-01",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: null,
  };
}

function renderList(searchParams = "") {
  return render(<TransactionsList />, { wrapper: withNuqsTestingAdapter({ searchParams }) });
}

describe("TransactionsList states", () => {
  beforeEach(() => {
    state.transactions = [];
    state.bankAccounts = [];
    state.error = null;
    vi.clearAllMocks();
  });

  it("empty without filters offers to create or import", async () => {
    renderList();
    const card = screen.getByText("No se encontraron transacciones.").parentElement!;
    expect(within(card).getByRole("button", { name: "Importar extracto" })).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: "Nueva transacción" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("empty because of filters offers to clear them", async () => {
    state.transactions = [tx(1)];
    renderList("?q=zzz&type=income");
    const card = screen.getByText(
      "No hay transacciones que coincidan con la búsqueda.",
    ).parentElement!;
    await userEvent.click(within(card).getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByText("Compra 1")).toBeInTheDocument();
  });

  it("load error offers a retry", async () => {
    state.error = new Error("boom");
    renderList();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudieron cargar las transacciones.");
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(state.refetch).toHaveBeenCalled();
  });

  it("warns when the 500 limit is reached", () => {
    state.transactions = Array.from({ length: 500 }, (_, i) => tx(i + 1));
    renderList("?q=zzz"); // oculta las filas: solo interesa el aviso
    expect(screen.getByRole("status")).toHaveTextContent(
      "Mostrando las 500 más recientes; filtra por fecha para ver más.",
    );
  });

  it("does not warn below the limit and names row actions", () => {
    state.transactions = [tx(1, "Arriendo")];
    renderList();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar: Arriendo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar: Arriendo" })).toBeInTheDocument();
  });
});

describe("TransactionsList › ajuste de conciliación", () => {
  beforeEach(() => {
    state.error = null;
    state.bankAccounts = [];
  });

  it("etiqueta como «Gasto no identificado» el ajuste pendiente sin categoría", () => {
    state.transactions = [
      {
        ...tx(1, "Ajuste de conciliación"),
        category_id: null,
        category_status: "pending",
        source: "reconciliation",
      },
      { ...tx(2, "Compra sin regla"), category_id: null, category_status: "pending" },
    ];
    renderList();
    expect(screen.getByText("Ajuste de conciliación").nextSibling).toHaveTextContent(
      "Gasto no identificado",
    );
    expect(screen.getByText("Compra sin regla").nextSibling).toHaveTextContent("Por editar");
    // El banner cuenta todo pendiente (no solo importados): no debe decir "importada(s)".
    expect(screen.getByRole("button", { name: /sin clasificar/ })).toHaveTextContent(
      "2 transacciones sin clasificar.",
    );
  });

  it("etiqueta como «Ingreso no identificado» el ajuste de ingreso", () => {
    state.transactions = [
      {
        ...tx(1, "Ajuste de conciliación"),
        type: "income",
        category_id: null,
        category_status: "pending",
        source: "reconciliation",
      },
    ];
    renderList();
    expect(screen.getByText("Ajuste de conciliación").nextSibling).toHaveTextContent(
      "Ingreso no identificado",
    );
  });

  it("una vez clasificado muestra su categoría", () => {
    state.transactions = [
      { ...tx(1, "Ajuste de conciliación"), source: "reconciliation", category_id: 1 },
    ];
    renderList();
    expect(screen.getByText("Ajuste de conciliación").nextSibling).toHaveTextContent("Mercado");
    expect(screen.queryByText(/Gasto no identificado/)).not.toBeInTheDocument();
  });
});

describe("TransactionsList transfer clone", () => {
  beforeEach(() => {
    state.error = null;
    vi.clearAllMocks();
  });

  it("checks the source account balance even though the row shown is the destination leg", async () => {
    const leg = {
      ...tx(0),
      type: "transfer" as TransactionRecord["type"],
      transfer_group_id: "g1",
    };
    // Only the source leg carries origin_account_id; the list shows the destination leg.
    state.transactions = [
      { ...leg, id: 1, amount: 80000, origin_account_id: 1, description: "Ahorro" },
      { ...leg, id: 2, amount: 80000, destination_account_id: 2, description: "Ahorro" },
    ];
    state.bankAccounts = [
      { id: 1, bank_name: "Bancolombia", display_balance: "50000" },
      { id: 2, bank_name: "Nu", display_balance: "0" },
    ];
    renderList();

    await userEvent.click(screen.getByTitle("Clonar transferencia"));

    expect(screen.getByText(/Saldo insuficiente/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clonar" })).toBeDisabled();
  });
});
