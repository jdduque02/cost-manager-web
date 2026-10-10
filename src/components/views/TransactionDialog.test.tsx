import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { TransactionDialog } from "./TransactionDialog";
import type { TransactionRecord } from "@/lib/api/finance";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: Record<string, unknown>) => (
    <a href={to as string} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/views/GoalDialog", () => ({
  GoalDialog: () => <div data-testid="goal-dialog" />,
}));
vi.mock("@/components/views/WealthDialog", () => ({
  WealthDialog: () => <div data-testid="wealth-dialog" />,
}));
vi.mock("@/components/views/TransferDialog", () => ({
  TransferDialog: (p: {
    open: boolean;
    convertFrom?: TransactionRecord | null;
    onConverted?: () => void;
  }) =>
    p.open ? (
      <div data-testid="transfer-dialog" data-convert-from={p.convertFrom?.id ?? ""}>
        <button type="button" onClick={p.onConverted}>
          simular conversión
        </button>
      </div>
    ) : null,
}));
vi.mock("@/components/views/EmpresaDialog", () => ({
  EmpresaDialog: () => <div data-testid="empresa-dialog" />,
}));

const catState = vi.hoisted(() => ({ empty: false }));
const productState = vi.hoisted(() => ({
  accounts: [] as {
    id: number;
    bank_name: string;
    masked_account_number: string;
    account_type: string;
    currency: string;
  }[],
}));
const mockCreateTx = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/use-api", () => {
  const noop = () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    mutate: vi.fn(),
  });
  return {
    useCategories: () => ({
      data: catState.empty
        ? []
        : [
            {
              id: 1,
              name: "Alimentación",
              group_type: "expense",
              user_id: "u1",
              created_at: "",
              updated_at: null,
              subcategories: [],
            },
            {
              id: 2,
              name: "Salario",
              group_type: "income",
              user_id: "u1",
              created_at: "",
              updated_at: null,
              subcategories: [],
            },
          ],
      isLoading: false,
    }),
    useSubcategories: () => ({ data: [] }),
    useObjectives: () => ({ data: [] }),
    useBankAccounts: () => ({ data: productState.accounts }),
    useFinancialAssets: () => ({ data: [] }),
    useFinancialLiabilities: () => ({ data: [] }),
    useEmpresas: () => ({ data: [] }),
    useCreateTransaction: () => ({ ...noop(), mutate: mockCreateTx }),
    useUpdateTransaction: noop,
    useCreateObjective: noop,
    useUpdateObjective: noop,
    useCalculateQuota: () => ({ data: null, ...noop() }),
    useCreateBankAccount: noop,
    useUpdateBankAccount: noop,
    useCreateFinancialAsset: noop,
    useUpdateFinancialAsset: noop,
    useCreateFinancialLiability: noop,
    useUpdateFinancialLiability: noop,
    useDeleteBankAccount: noop,
    useDeleteFinancialAsset: noop,
    useDeleteFinancialLiability: noop,
    useCreateEmpresa: noop,
    useUpdateEmpresa: noop,
    useDeleteEmpresa: noop,
    useCreateCategory: noop,
    useUpdateCategory: noop,
    useDeleteCategory: noop,
    useCreateSubcategory: noop,
    useUpdateSubcategory: noop,
    useDeleteSubcategory: noop,
    useCreateTransfer: noop,
    useUpdateTransfer: noop,
    useDeleteTransfer: noop,
    useDeleteTransaction: noop,
    useBulkDeleteTransactions: noop,
    useCloneTransaction: noop,
    useExchangeRate: () => ({ data: null, isLoading: false }),
    useNetWorth: () => ({ data: null, isLoading: false }),
    useFinancialBudgetProfile: () => ({ data: null, isLoading: false }),
    useCreateFinancialBudgetProfile: noop,
    useUpdateFinancialBudgetProfile: noop,
    useTransactionSummary: () => ({ data: null, isLoading: false }),
    useTaxSummary: () => ({ data: null, isLoading: false }),
    useNews: () => ({ data: [], isLoading: false }),
    useStatementImports: () => ({ data: [], isLoading: false }),
    useStatementImportJob: () => ({ data: null, isLoading: false }),
    useStatementImportProgress: () => ({ data: null }),
    useCreateStatementImport: noop,
    useRetryStatementImport: noop,
    useRefreshAssetQuotes: noop,
    useUpdateUser: noop,
  };
});

describe("TransactionDialog", () => {
  const defaultProps = { open: true, onOpenChange: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets the user register without categories (category is optional)", () => {
    catState.empty = true;
    try {
      render(<TransactionDialog {...defaultProps} />);
      expect(screen.queryByText("Sin categorías configuradas")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Monto")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /crear categor/i })).toBeInTheDocument();
    } finally {
      catState.empty = false;
    }
  });

  it("creates with mutate and shows the API error without an unhandled rejection", async () => {
    mockCreateTx.mockImplementation((_dto, opts) => opts.onError(new Error("Monto inválido")));
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TransactionDialog {...defaultProps} />);

    await user.type(screen.getByLabelText("Monto"), "50000");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(mockCreateTx).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Monto inválido");
    expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);
  });

  describe("moneda del producto (R7.1–R7.3)", () => {
    const fxNotice = "Se registrará en USD con la TRM oficial de la fecha";

    beforeEach(() => {
      productState.accounts = [
        {
          id: 3,
          bank_name: "Nu",
          masked_account_number: "****1111",
          account_type: "ahorros",
          currency: "COP",
        },
        {
          id: 4,
          bank_name: "Wise",
          masked_account_number: "****2222",
          account_type: "ahorros",
          currency: "USD",
        },
      ];
    });
    afterEach(() => {
      productState.accounts = [];
    });

    it("con el monto vacío hereda la moneda de la cuenta elegida, muestra la moneda en cada opción y no avisa si coinciden", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransactionDialog {...defaultProps} />);

      await user.click(screen.getByLabelText("Patrimonio asociado"));
      expect(
        await screen.findByRole("option", { name: "Nu · ****1111 (COP)" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("option", { name: "Wise · ****2222 (USD)" }));

      expect(document.getElementById("tx-currency")).toHaveTextContent("USD");
      expect(screen.queryByText(fxNotice)).not.toBeInTheDocument();
    });

    it("avisa sin cifra cuando la moneda elegida difiere de la del producto y deja de avisar al igualarla", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransactionDialog {...defaultProps} />);

      await user.click(screen.getByLabelText("Patrimonio asociado"));
      await user.click(await screen.findByRole("option", { name: "Wise · ****2222 (USD)" }));
      await user.click(document.getElementById("tx-currency")!);
      await user.click(await screen.findByRole("option", { name: "COP" }));

      expect(screen.getByText(fxNotice)).toBeInTheDocument();

      await user.click(document.getElementById("tx-currency")!);
      await user.click(await screen.findByRole("option", { name: "USD" }));
      expect(screen.queryByText(fxNotice)).not.toBeInTheDocument();
    });

    it("con un monto escrito, elegir una cuenta USD conserva la moneda y avisa (R7.1)", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransactionDialog {...defaultProps} />);

      await user.type(screen.getByLabelText("Monto"), "200000");
      await user.click(screen.getByLabelText("Patrimonio asociado"));
      await user.click(await screen.findByRole("option", { name: "Wise · ****2222 (USD)" }));

      expect(document.getElementById("tx-currency")).toHaveTextContent("COP");
      expect(screen.getByText(fxNotice)).toBeInTheDocument();
    });

    // Movimiento en COP sobre la cuenta USD, previo a la conversión (sin `fx_rate`).
    const historic = {
      id: 9,
      type: "expense",
      amount: 50000,
      currency: "COP",
      fx_rate: null,
      account_id: 4,
      transaction_date: "2024-06-15",
      is_fixed: false,
    } as TransactionRecord;

    it("al editar un histórico sin fx_rate no avisa; al cambiarle la fecha sí (R7.3)", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransactionDialog {...defaultProps} transaction={historic} />);

      expect(screen.queryByText(fxNotice)).not.toBeInTheDocument();

      const dateInput = screen.getByLabelText("Fecha de la transacción");
      await user.clear(dateInput);
      await user.type(dateInput, "16062024");
      expect(screen.getByText(fxNotice)).toBeInTheDocument();
    });

    it("al editar un movimiento que ya tenía fx_rate avisa sin tocar nada (R7.3)", () => {
      render(<TransactionDialog {...defaultProps} transaction={{ ...historic, fx_rate: 4000 }} />);
      expect(screen.getByText(fxNotice)).toBeInTheDocument();
    });
  });

  it("explica en el selector de patrimonio que un gasto ligado a un pasivo sube la deuda (R6.11)", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(
      screen.getByText(
        "Un gasto ligado a un pasivo sube la deuda; un ingreso o una inversión la bajan. Para pagar la tarjeta usa «Transferir».",
      ),
    ).toBeInTheDocument();
  });

  it("renders when open", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(screen.getByText("Nueva Transacción")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<TransactionDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Nueva Transacción")).not.toBeInTheDocument();
  });

  it("renders transaction type options", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(screen.getByText("Gasto")).toBeInTheDocument();
    expect(screen.getByText("Ingreso")).toBeInTheDocument();
    expect(screen.getByText("Inversión")).toBeInTheDocument();
  });

  it("renders amount label", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(screen.getByText("Monto")).toBeInTheDocument();
  });

  it("renders payment method label", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(screen.getByText("Método de pago")).toBeInTheDocument();
  });

  it("renders date label", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(screen.getByText("Fecha de la transacción")).toBeInTheDocument();
  });

  it("renders description field", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(screen.getByText("Descripción")).toBeInTheDocument();
  });

  it("renders save button", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
  });

  it("associates the amount label with its input via id", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(screen.getByLabelText("Monto")).toBeInTheDocument();
  });

  it("associates the description label with its input via id", () => {
    render(<TransactionDialog {...defaultProps} />);
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
  });

  it("shows edit title when transaction provided", () => {
    render(
      <TransactionDialog
        {...defaultProps}
        transaction={{
          id: 1,
          user_id: "user-1",
          type: "expense",
          amount: 50000,
          category_id: 1,
          category_name: "Alimentación",
          subcategory_id: null,
          subcategory_name: null,
          description: "Almuerzo",
          transaction_date: "2024-06-15",
          payment_method: "cash",
          is_fixed: false,
          fixed_type: null,
          fixed_frequency: null,
          empresa_id: null,
          empresa_name: null,
          objective_id: null,
          objective_name: null,
          bank_account_id: null,
          bank_account_name: null,
          financial_asset_id: null,
          financial_asset_name: null,
          financial_liability_id: null,
          financial_liability_name: null,
          created_at: "2024-06-15",
          updated_at: null,
        }}
      />,
    );
    expect(screen.getByText("Editar Transacción")).toBeInTheDocument();
  });

  describe("convertir en transferencia (R4.1, R4.6, R4.9)", () => {
    const tx = {
      id: 40,
      type: "income",
      amount: 750000,
      currency: "COP",
      account_id: 1,
      transaction_date: "2026-09-15",
      is_fixed: false,
      created_at: "2026-09-15",
      updated_at: null,
    } as TransactionRecord;

    it("editar ingreso abre conversión y, al convertir, cierra también la edición", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransactionDialog {...defaultProps} transaction={tx} />);

      await user.click(screen.getByRole("button", { name: "Transferencia" }));

      expect(screen.getByTestId("transfer-dialog")).toHaveAttribute("data-convert-from", "40");
      expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);

      await user.click(
        // El mock queda fuera del Dialog modal (aria-hidden); el TransferDialog real va en su propio portal.
        screen.getByRole("button", { name: "simular conversión", hidden: true }),
      );
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it.each([
      ["inversión", { type: "investment" }, /Solo los ingresos y gastos/],
      ["sin cuenta", { account_id: null }, /ligados a una cuenta bancaria/],
      ["conciliación", { source: "reconciliation" }, /ajuste de conciliación/],
      ["recurrente", { recurring_id: 7 }, /ocurrencia de un recurrente/],
    ] as const)("%s: Transferencia deshabilitado con el motivo", async (_n, patch, reason) => {
      render(
        <TransactionDialog
          {...defaultProps}
          transaction={{ ...tx, ...patch } as TransactionRecord}
        />,
      );

      const button = screen.getByRole("button", { name: "Transferencia" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", expect.stringMatching(reason));
      expect(button).toHaveAccessibleDescription(reason);
      expect(screen.queryByTestId("transfer-dialog")).not.toBeInTheDocument();
    });

    it("nueva transacción abre transferencia vacía", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<TransactionDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Transferencia" }));

      expect(screen.getByTestId("transfer-dialog")).toHaveAttribute("data-convert-from", "");
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
