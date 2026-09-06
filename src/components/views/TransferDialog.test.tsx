import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransferDialog } from "./TransferDialog";

const noop = () => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
  mutate: vi.fn(),
  isPending: false,
});

let mockBankAccounts: Array<{
  id: number;
  bank_name: string;
  masked_account_number: string;
  display_balance: string;
}> = [];
let mockLiabilities: Array<{ id: number; name: string; liability_type: string; currency: string }> =
  [];

vi.mock("@/lib/hooks/use-api", () => ({
  useCreateTransfer: () => noop(),
  useUpdateTransfer: () => noop(),
  useBankAccounts: () => ({ data: mockBankAccounts, isLoading: false }),
  useObjectives: () => ({ data: [], isLoading: false }),
  useEmpresas: () => ({ data: [] }),
  useFinancialLiabilities: () => ({ data: mockLiabilities }),
}));

describe("TransferDialog", () => {
  const defaultProps = { open: true, onOpenChange: vi.fn() };

  beforeEach(() => {
    mockBankAccounts = [];
    mockLiabilities = [];
    vi.clearAllMocks();
  });

  it("shows a message when there are no bank accounts at all", () => {
    render(<TransferDialog {...defaultProps} />);
    expect(
      screen.getByText("Necesitas al menos una cuenta bancaria para registrar una transferencia."),
    ).toBeInTheDocument();
  });

  it("shows a 'no destination available' message with a single account and no credit cards", async () => {
    mockBankAccounts = [
      {
        id: 1,
        bank_name: "Bancolombia",
        masked_account_number: "****1234",
        display_balance: "100000",
      },
    ];
    mockLiabilities = [];
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TransferDialog {...defaultProps} />);

    await user.click(screen.getAllByText("Seleccionar...")[0]);
    await user.click(await screen.findByRole("option", { name: /Bancolombia/ }));

    expect(
      screen.getByText("No hay ninguna otra cuenta o tarjeta de crédito disponible como destino."),
    ).toBeInTheDocument();
  });

  it("suggests using a credit card as destination when one is available", async () => {
    mockBankAccounts = [
      {
        id: 1,
        bank_name: "Bancolombia",
        masked_account_number: "****1234",
        display_balance: "100000",
      },
    ];
    mockLiabilities = [{ id: 9, name: "Visa", liability_type: "tarjeta_credito", currency: "COP" }];
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TransferDialog {...defaultProps} />);

    await user.click(screen.getAllByText("Seleccionar...")[0]);
    await user.click(await screen.findByRole("option", { name: /Bancolombia/ }));

    expect(
      screen.getByText(
        'No hay otra cuenta bancaria disponible. Usa "Tarjeta de crédito" como destino.',
      ),
    ).toBeInTheDocument();
  });

  it("formats the source balance with fmtCurrency (es-CO currency format)", async () => {
    mockBankAccounts = [
      {
        id: 1,
        bank_name: "Bancolombia",
        masked_account_number: "****1234",
        display_balance: "100000",
      },
      { id: 2, bank_name: "Nu", masked_account_number: "****5678", display_balance: "50000" },
    ];
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TransferDialog {...defaultProps} />);

    await user.click(screen.getAllByText("Seleccionar...")[0]);
    await user.click(await screen.findByRole("option", { name: /Bancolombia/ }));

    expect(screen.getByText(/Saldo: \$\s?100\.000/)).toBeInTheDocument();
  });
});
