import { render, screen } from "@testing-library/react";
import { GoalDialog } from "./GoalDialog";

vi.mock("@/lib/hooks/use-api", () => {
  const noop = () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    mutate: vi.fn(),
  });
  return {
    useCreateObjective: noop,
    useUpdateObjective: noop,
    useCalculateQuota: () => ({ data: null, ...noop() }),
    useBankAccounts: () => ({ data: [] }),
    useCreateBankAccount: noop,
    useUpdateBankAccount: noop,
    useDeleteBankAccount: noop,
    useCreateFinancialAsset: noop,
    useUpdateFinancialAsset: noop,
    useDeleteFinancialAsset: noop,
    useCreateFinancialLiability: noop,
    useUpdateFinancialLiability: noop,
    useDeleteFinancialLiability: noop,
    useCategories: () => ({ data: [], isLoading: false }),
    useSubcategories: () => ({ data: [] }),
    useObjectives: () => ({ data: [] }),
    useCreateCategory: noop,
    useUpdateCategory: noop,
    useDeleteCategory: noop,
    useCreateSubcategory: noop,
    useUpdateSubcategory: noop,
    useDeleteSubcategory: noop,
    useCreateTransaction: noop,
    useUpdateTransaction: noop,
    useDeleteTransaction: noop,
    useBulkDeleteTransactions: noop,
    useCloneTransaction: noop,
    useEmpresas: () => ({ data: [] }),
    useCreateEmpresa: noop,
    useUpdateEmpresa: noop,
    useDeleteEmpresa: noop,
    useCreateTransfer: noop,
    useUpdateTransfer: noop,
    useDeleteTransfer: noop,
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

vi.mock("@/components/views/WealthDialog", () => ({ WealthDialog: () => null }));

describe("GoalDialog", () => {
  const defaultProps = { open: true, onOpenChange: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<GoalDialog {...defaultProps} />);
    expect(screen.getByText("Nueva Meta")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<GoalDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Nueva Meta")).not.toBeInTheDocument();
  });

  it("renders step 1 heading", () => {
    render(<GoalDialog {...defaultProps} />);
    expect(screen.getByText("Define una nueva meta de ahorro o préstamo.")).toBeInTheDocument();
  });

  it("renders name input", () => {
    render(<GoalDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText("Ej. Ahorrar para la moto")).toBeInTheDocument();
  });

  it("renders labels for type and amounts", () => {
    render(<GoalDialog {...defaultProps} />);
    expect(screen.getByText("Tipo")).toBeInTheDocument();
    expect(screen.getByText("Monto objetivo")).toBeInTheDocument();
    expect(screen.getByText("Ahorrado actual")).toBeInTheDocument();
  });

  it("renders next step button", () => {
    render(<GoalDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeInTheDocument();
  });

  it("renders edit title when goal provided", () => {
    render(
      <GoalDialog
        {...defaultProps}
        goal={{
          id: 1,
          user_id: "user-1",
          name: "Vacaciones",
          target_amount: 5000000,
          current_amount: 1000000,
          type: "savings",
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          quota_frequency: null,
          quota_amount: null,
          bank_account_id: null,
          bank_account_name: null,
          status: "active",
          created_at: "2024-01-01",
          updated_at: null,
        }}
      />,
    );
    expect(screen.getByText("Editar Meta")).toBeInTheDocument();
  });
});
