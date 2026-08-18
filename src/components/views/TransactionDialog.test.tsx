import { render, screen } from "@testing-library/react";
import { TransactionDialog } from "./TransactionDialog";

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
  TransferDialog: () => <div data-testid="transfer-dialog" />,
}));
vi.mock("@/components/views/EmpresaDialog", () => ({
  EmpresaDialog: () => <div data-testid="empresa-dialog" />,
}));

vi.mock("@/lib/hooks/use-api", () => {
  const noop = () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    mutate: vi.fn(),
  });
  return {
    useCategories: () => ({
      data: [
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
    useBankAccounts: () => ({ data: [] }),
    useFinancialAssets: () => ({ data: [] }),
    useFinancialLiabilities: () => ({ data: [] }),
    useEmpresas: () => ({ data: [] }),
    useCreateTransaction: noop,
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
});
