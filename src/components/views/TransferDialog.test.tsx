import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransferDialog } from "./TransferDialog";
import type { TransferResponse } from "@/lib/api/finance";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const noop = () => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
  mutate: vi.fn(),
  isPending: false,
});

const mockUpdate = vi.fn();

let mockBankAccounts: Array<{
  id: number;
  bank_name: string;
  masked_account_number: string;
  display_balance: string;
  currency?: string;
}> = [];
let mockLiabilities: Array<{ id: number; name: string; liability_type: string; currency: string }> =
  [];

vi.mock("@/lib/hooks/use-api", () => ({
  useCreateTransfer: () => noop(),
  useUpdateTransfer: () => ({ ...noop(), mutate: mockUpdate }),
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

  describe("moneda (R7.2, R7.3, R7.5)", () => {
    beforeEach(() => {
      mockBankAccounts = [
        {
          id: 1,
          bank_name: "Bancolombia",
          masked_account_number: "****1234",
          display_balance: "100000",
          currency: "COP",
        },
        {
          id: 2,
          bank_name: "Wise",
          masked_account_number: "****9999",
          display_balance: "250.5",
          currency: "USD",
        },
        {
          id: 3,
          bank_name: "Nu",
          masked_account_number: "****5678",
          display_balance: "0",
          currency: "COP",
        },
      ];
    });

    async function pick(user: ReturnType<typeof userEvent.setup>, trigger: number, option: RegExp) {
      await user.click(screen.getAllByText("Seleccionar...")[trigger]);
      await user.click(await screen.findByRole("option", { name: option }));
    }

    it("muestra la moneda en las opciones y el saldo en la moneda de cada cuenta", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransferDialog {...defaultProps} />);

      await user.click(screen.getAllByText("Seleccionar...")[0]);
      expect(
        await screen.findByRole("option", { name: "Bancolombia · ****1234 (COP)" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("option", { name: "Wise · ****9999 (USD)" }));

      expect(screen.getByText(/Saldo: US\$\s?250,5/)).toBeInTheDocument();
    });

    it("avisa cuando origen y destino tienen distinta moneda", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransferDialog {...defaultProps} />);

      await pick(user, 0, /Bancolombia/);
      await pick(user, 0, /Wise/);

      expect(
        screen.getByText("Se registrará en USD con la TRM oficial de la fecha"),
      ).toBeInTheDocument();
    });

    it("no avisa cuando origen y destino tienen la misma moneda", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransferDialog {...defaultProps} />);

      await pick(user, 0, /Bancolombia/);
      await pick(user, 0, /Nu/);

      expect(screen.queryByText(/con la TRM oficial de la fecha/)).not.toBeInTheDocument();
    });
  });

  describe("editing", () => {
    const movement = {
      liability_id: null,
      bank_name: null,
      account_type: null,
      amount: 80000,
      currency: "COP",
      transaction_date: "2026-09-01",
      description: null,
      reference_code: null,
      created_at: "2026-09-01",
      updated_at: null,
    };
    const transfer: TransferResponse = {
      transfer_group_id: "g1",
      amount: 80000,
      transaction_date: "2026-09-01",
      description: null,
      reference_code: null,
      is_fixed: true,
      frequency: "monthly",
      due_day: 5,
      reminder_days: 3,
      source: { ...movement, id: 10, account_id: 1, side: "source" },
      destination: { ...movement, id: 11, account_id: 2, side: "destination" },
    };

    beforeEach(() => {
      // Balance already reflects the transfer: 130.000 - 80.000.
      mockBankAccounts = [
        {
          id: 1,
          bank_name: "Bancolombia",
          masked_account_number: "****1234",
          display_balance: "50000",
        },
        { id: 2, bank_name: "Nu", masked_account_number: "****5678", display_balance: "0" },
      ];
    });

    it("adds the original amount back when checking the balance", () => {
      render(<TransferDialog {...defaultProps} transfer={transfer} />);
      expect(screen.queryByText(/Saldo insuficiente/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
    });

    it("sends is_fixed: false when the fixed flag is unchecked", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransferDialog {...defaultProps} transfer={transfer} />);

      await user.click(screen.getByRole("checkbox", { name: "Marcar como transferencia fija" }));
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: "10", dto: expect.objectContaining({ is_fixed: false }) }),
        expect.anything(),
      );
    });

    it("uses mutate and shows the API error without an unhandled rejection", async () => {
      mockUpdate.mockImplementation((_vars, opts) => opts.onError(new Error("Saldo insuficiente")));
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransferDialog {...defaultProps} transfer={transfer} />);

      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(toast.error).toHaveBeenCalledWith("Saldo insuficiente");
      expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });
});
