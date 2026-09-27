import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { CategoryDialog } from "./CategoryDialog";

const createMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: { loading: vi.fn(() => "tid"), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/hooks/use-api", () => ({
  useCreateCategory: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

describe("CategoryDialog", () => {
  const defaultProps = { open: true, onOpenChange: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create dialog when no category provided", () => {
    render(<CategoryDialog {...defaultProps} />);
    expect(screen.getByText("Nueva Categoría")).toBeInTheDocument();
  });

  it("renders edit dialog when category provided", () => {
    render(
      <CategoryDialog
        {...defaultProps}
        category={{
          id: 1,
          name: "Alimentación",
          group_type: "expense",
          profile_bucket: "needs",
          user_id: "user-1",
          created_at: "2024-01-01",
          updated_at: null,
          subcategories: [],
        }}
      />,
    );
    expect(screen.getByText("Editar Categoría")).toBeInTheDocument();
  });

  it("renders name input field", () => {
    render(<CategoryDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText("Ej. Alimentación")).toBeInTheDocument();
  });

  it("renders type select with Gasto option", () => {
    render(<CategoryDialog {...defaultProps} />);
    expect(screen.getAllByText("Gasto").length).toBeGreaterThan(0);
  });

  it("does not render when closed", () => {
    render(<CategoryDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Nueva Categoría")).not.toBeInTheDocument();
  });

  it("pre-fills form in edit mode", () => {
    render(
      <CategoryDialog
        {...defaultProps}
        category={{
          id: 1,
          name: "Transporte",
          group_type: "income",
          profile_bucket: null,
          user_id: "user-1",
          created_at: "2024-01-01",
          updated_at: null,
          subcategories: [],
        }}
      />,
    );
    expect(screen.getByDisplayValue("Transporte")).toBeInTheDocument();
  });

  it("associates the name label with its input via id", () => {
    render(<CategoryDialog {...defaultProps} />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });

  it("shows the API cause in the error toast when creation fails", async () => {
    createMock.mockRejectedValueOnce(new Error("Ya existe una categoría con ese nombre"));
    render(<CategoryDialog {...defaultProps} />);
    await userEvent.type(screen.getByLabelText("Nombre"), "Mercado");
    await userEvent.click(screen.getByRole("button", { name: /crear/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Ya existe una categoría con ese nombre", {
        id: "tid",
      }),
    );
  });

  it("renders submit button", () => {
    render(<CategoryDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: /crear/i })).toBeInTheDocument();
  });
});
