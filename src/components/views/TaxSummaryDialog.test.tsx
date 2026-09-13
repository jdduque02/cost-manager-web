import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaxSummaryDialog } from "./TaxSummaryDialog";

const mockMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("@/lib/hooks/use-api", () => ({
  useUpdateTaxSummary: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const taxSummary = {
  id: 1,
  user_id: 10,
  fiscal_year: 2026,
  total_income: 72000000,
  total_assets: 200000000,
  total_liabilities: 50000000,
  patrimony: 150000000,
  income_in_uvt: 1686.92,
  assets_in_uvt: 4684.05,
  uvt_value: 42680,
  must_declare: true,
  estimated_tax: 5000000,
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("TaxSummaryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prellena los campos con los valores del resumen fiscal", () => {
    render(<TaxSummaryDialog open onOpenChange={vi.fn()} taxSummary={taxSummary as never} />);

    expect(screen.getByText(/editar resumen fiscal 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /debe declarar impuestos/i })).toBeChecked();
  });

  it("envía la actualización con los valores editados", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<TaxSummaryDialog open onOpenChange={onOpenChange} taxSummary={taxSummary as never} />);

    await user.click(screen.getByRole("checkbox", { name: /debe declarar impuestos/i }));
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        dto: expect.objectContaining({ must_declare: false }),
      }),
      expect.anything(),
    );
  });

  it("no envía la actualización si no hay resumen fiscal cargado", async () => {
    const user = userEvent.setup();
    render(<TaxSummaryDialog open onOpenChange={vi.fn()} taxSummary={null} />);

    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
