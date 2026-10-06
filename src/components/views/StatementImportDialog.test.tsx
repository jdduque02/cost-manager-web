import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatementImportDialog } from "./StatementImportDialog";

const createAsync = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/use-api", () => {
  const mutation = () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false });
  const empty = () => ({ data: [] });
  return {
    useCategories: empty,
    useBankAccounts: empty,
    useEmpresas: empty,
    useStatementImports: empty,
    useFinancialLiabilities: empty,
    useCreateStatementImport: () => ({ mutateAsync: createAsync, isPending: false }),
    useRetryStatementImport: mutation,
    useStatementImportJob: () => ({ data: undefined }),
    useStatementImportProgress: () => undefined,
  };
});

async function uploadPdf(user: ReturnType<typeof userEvent.setup>) {
  const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
  await user.upload(input, new File(["%PDF"], "extracto.pdf", { type: "application/pdf" }));
}

describe("StatementImportDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows importing without categories (default category is optional)", async () => {
    const user = userEvent.setup();
    render(<StatementImportDialog open onOpenChange={vi.fn()} />);

    expect(screen.queryByText("Sin categorías configuradas")).not.toBeInTheDocument();
    const submit = screen.getByRole("button", { name: /^importar$/i });
    expect(submit).toBeDisabled();

    await uploadPdf(user);

    expect(submit).toBeEnabled();
  });

  it("captura y registra empresas por defecto", async () => {
    createAsync.mockResolvedValue({ id: 1, status: "pending", total_files: 1, files: [] });
    const user = userEvent.setup();
    render(<StatementImportDialog open onOpenChange={vi.fn()} />);

    const toggle = screen.getByRole("checkbox", { name: "Capturar y registrar empresas" });
    expect(toggle).toBeChecked();
    expect(screen.getByText(/si no existe lo crea/i)).toBeInTheDocument();

    await uploadPdf(user);
    await user.click(screen.getByRole("button", { name: /^importar$/i }));

    const form = createAsync.mock.calls[0][0] as FormData;
    expect(form.get("capture_companies")).toBe("true");
  });

  it("con el producto fijado envía la tarjeta y avisa con onCompleted al terminar el lote", async () => {
    createAsync.mockResolvedValue({
      id: 42,
      status: "completed",
      total_files: 1,
      processed_files: 1,
      success_files: 1,
      failed_files: 0,
      total_records_parsed: 3,
      total_records_created: 2,
      total_records_skipped: 1,
      total_records_failed: 0,
      total_records_uncategorized: 0,
      files: [],
      created_at: "2026-09-27",
      updated_at: null,
    });
    const onCompleted = vi.fn();
    const user = userEvent.setup();
    render(
      <StatementImportDialog
        open
        onOpenChange={vi.fn()}
        presetLiabilityId={4}
        onCompleted={onCompleted}
      />,
    );

    await uploadPdf(user);
    await user.click(screen.getByRole("button", { name: /^importar$/i }));

    const form = createAsync.mock.calls[0][0] as FormData;
    expect(form.get("liability_id")).toBe("4");
    expect(form.get("account_id")).toBeNull();
    await waitFor(() => expect(onCompleted).toHaveBeenCalledWith(42));
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });
});
