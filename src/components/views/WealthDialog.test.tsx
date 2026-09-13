import { render, screen } from "@testing-library/react";
import { WealthDialog } from "./WealthDialog";

vi.mock("@/lib/hooks/use-api", () => {
  const noop = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    useCreateBankAccount: noop,
    useUpdateBankAccount: noop,
    useCreateFinancialAsset: noop,
    useUpdateFinancialAsset: noop,
    useCreateFinancialLiability: noop,
    useUpdateFinancialLiability: noop,
  };
});

describe("WealthDialog", () => {
  const defaultProps = { open: true, onOpenChange: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create dialog for an account", () => {
    render(<WealthDialog {...defaultProps} entityType="account" />);
    expect(screen.getByText("Nueva Cuenta")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<WealthDialog {...defaultProps} entityType="account" open={false} />);
    expect(screen.queryByText("Nueva Cuenta")).not.toBeInTheDocument();
  });

  it("associates account fields with their labels via id", () => {
    render(<WealthDialog {...defaultProps} entityType="account" />);
    expect(screen.getByLabelText("Banco")).toBeInTheDocument();
    expect(screen.getByLabelText("Saldo")).toBeInTheDocument();
  });

  it("renders create dialog for an asset", () => {
    render(<WealthDialog {...defaultProps} entityType="asset" />);
    expect(screen.getByText("Nuevo Activo")).toBeInTheDocument();
  });

  it("associates asset fields with their labels via id", () => {
    render(<WealthDialog {...defaultProps} entityType="asset" />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Valor actual")).toBeInTheDocument();
  });

  it("renders create dialog for a liability", () => {
    render(<WealthDialog {...defaultProps} entityType="liability" />);
    expect(screen.getByText("Nueva Deuda")).toBeInTheDocument();
  });

  it("associates liability fields with their labels via id", () => {
    render(<WealthDialog {...defaultProps} entityType="liability" />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Saldo actual")).toBeInTheDocument();
  });
});
