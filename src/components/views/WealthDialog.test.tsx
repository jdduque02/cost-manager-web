import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { t } from "@/lib/i18n/errors";
import { WealthDialog } from "./WealthDialog";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Toda mutación falla: el diálogo debe manejar el error con `mutate` + onError.
const mockMutate = vi.hoisted(() =>
  vi.fn((_vars: unknown, opts: { onError: (e: Error) => void }) => opts.onError(new Error("x"))),
);

vi.mock("@/lib/hooks/use-api", () => {
  const noop = () => ({ mutate: mockMutate, isPending: false });
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

  it.each([
    ["account", { Banco: "Nu", Saldo: "1000" }, "err.register.create"],
    ["asset", { Nombre: "CDT", "Valor actual": "1000" }, "err.asset.create"],
    ["liability", { Nombre: "Visa", "Saldo actual": "1000" }, "err.debt.create"],
  ] as const)(
    "creates a %s with mutate and toasts the error",
    async (entityType, fields, errKey) => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<WealthDialog {...defaultProps} entityType={entityType} />);
      for (const [label, value] of Object.entries(fields)) {
        await user.type(screen.getByLabelText(label), value);
      }
      await user.click(screen.getByRole("button", { name: "Crear" }));

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(t(errKey));
      expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);
    },
  );

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
