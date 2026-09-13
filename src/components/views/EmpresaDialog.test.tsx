import { render, screen } from "@testing-library/react";
import { EmpresaDialog } from "./EmpresaDialog";

vi.mock("@/lib/hooks/use-api", () => ({
  useCategories: () => ({ data: [] }),
  useCreateEmpresa: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useUpdateEmpresa: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

describe("EmpresaDialog", () => {
  const defaultProps = { open: true, onOpenChange: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create dialog when no empresa provided", () => {
    render(<EmpresaDialog {...defaultProps} />);
    expect(screen.getByText("Nueva Empresa")).toBeInTheDocument();
  });

  it("renders edit dialog when empresa provided", () => {
    render(
      <EmpresaDialog
        {...defaultProps}
        empresa={{
          id: 1,
          user_id: 1,
          name: "Acme Corp",
          default_category_id: null,
          created_at: "2024-01-01",
          updated_at: null,
        }}
      />,
    );
    expect(screen.getByText("Editar Empresa")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<EmpresaDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Nueva Empresa")).not.toBeInTheDocument();
  });

  it("associates the name label with its input via id", () => {
    render(<EmpresaDialog {...defaultProps} />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });

  it("associates the default category label with its select via id", () => {
    render(<EmpresaDialog {...defaultProps} />);
    expect(screen.getByLabelText("Categoría por defecto (opcional)")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<EmpresaDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: /crear/i })).toBeInTheDocument();
  });
});
