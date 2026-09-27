import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { InlineCategoryCreator } from "./inline-category-creator";
import { InlineSubcategoryCreator } from "./inline-subcategory-creator";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Falla con onError: sin mutateAsync no queda ninguna promesa rechazada sin manejar.
const mockMutate = vi.hoisted(() =>
  vi.fn((_vars: unknown, opts: { onError: (e: Error) => void }) =>
    opts.onError(new Error("Ya existe")),
  ),
);

vi.mock("@/lib/hooks/use-api", () => ({
  useCreateCategory: () => ({ mutate: mockMutate, isPending: false }),
  useCreateSubcategory: () => ({ mutate: mockMutate, isPending: false }),
}));

describe.each([
  [
    "InlineCategoryCreator",
    (onCreated: () => void) => <InlineCategoryCreator groupType="expense" onCreated={onCreated} />,
    "Nombre categoría",
  ],
  [
    "InlineSubcategoryCreator",
    (onCreated: () => void) => <InlineSubcategoryCreator categoryId={1} onCreated={onCreated} />,
    "Nombre subcategoría",
  ],
] as const)("%s", (_name, ui, placeholder) => {
  beforeEach(() => vi.clearAllMocks());

  it("creates with mutate and toasts the API error, keeping the input open", async () => {
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(ui(onCreated));

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText(placeholder), "Mascotas{Enter}");

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Ya existe");
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(placeholder)).toHaveValue("Mascotas");
  });
});
