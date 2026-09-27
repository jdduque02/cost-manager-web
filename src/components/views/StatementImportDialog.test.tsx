import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatementImportDialog } from "./StatementImportDialog";

vi.mock("@/lib/hooks/use-api", () => {
  const mutation = () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false });
  const empty = () => ({ data: [] });
  return {
    useCategories: empty,
    useBankAccounts: empty,
    useEmpresas: empty,
    useStatementImports: empty,
    useFinancialLiabilities: empty,
    useCreateStatementImport: mutation,
    useRetryStatementImport: mutation,
    useStatementImportJob: () => ({ data: undefined }),
    useStatementImportProgress: () => undefined,
  };
});

describe("StatementImportDialog", () => {
  it("allows importing without categories (default category is optional)", async () => {
    const user = userEvent.setup();
    render(<StatementImportDialog open onOpenChange={vi.fn()} />);

    expect(screen.queryByText("Sin categorías configuradas")).not.toBeInTheDocument();
    const submit = screen.getByRole("button", { name: /^importar$/i });
    expect(submit).toBeDisabled();

    const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(["%PDF"], "extracto.pdf", { type: "application/pdf" }));

    expect(submit).toBeEnabled();
  });
});
