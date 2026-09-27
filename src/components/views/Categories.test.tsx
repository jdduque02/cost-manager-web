import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Categories } from "./Categories";
import { setLocale } from "@/lib/i18n/errors";

beforeAll(() => setLocale("es"));

const state = vi.hoisted(() => ({
  categories: [] as unknown[],
  error: null as Error | null,
  refetch: vi.fn(),
}));

vi.mock("./CategoryDialog", () => ({ CategoryDialog: () => null }));

vi.mock("@/lib/hooks/use-api", () => {
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    useCategories: () => ({
      data: state.categories,
      isLoading: false,
      error: state.error,
      refetch: state.refetch,
    }),
    useSubcategories: () => ({
      data: [{ id: 7, name: "Arriendo", category_id: 1 }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useCreateSubcategory: mutation,
    useUpdateSubcategory: mutation,
    useDeleteSubcategory: mutation,
    useDeleteCategory: mutation,
  };
});

describe("Categories", () => {
  beforeEach(() => {
    state.categories = [];
    state.error = null;
    vi.clearAllMocks();
  });

  it("shows a load error with retry instead of the empty state", async () => {
    state.error = new Error("boom");
    render(<Categories />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las categorías.");
    expect(screen.queryByText("No hay categorías disponibles.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(state.refetch).toHaveBeenCalled();
  });

  it("names the icon-only category and subcategory buttons", () => {
    state.categories = [{ id: 1, name: "Vivienda", group_type: "expense", subcategories: [] }];
    render(<Categories />);
    for (const name of [
      "Editar: Vivienda",
      "Eliminar: Vivienda",
      "Editar: Arriendo",
      "Eliminar: Arriendo",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});
