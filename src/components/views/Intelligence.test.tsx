import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Intelligence } from "./Intelligence";

const mockMutate = vi.fn();

vi.mock("@/lib/hooks/use-formatted-amount", () => ({
  useFormattedAmount: () => (v: number) => `$${v}`,
}));

const mockCalculateTaxSummary = vi.fn();

vi.mock("@/lib/hooks/use-api", () => ({
  useFinancialBudgetProfile: () => ({ data: null, isLoading: false }),
  useTransactionSummary: () => ({ data: undefined, isLoading: false }),
  useTaxSummary: vi.fn(),
  useCalculateTaxSummary: () => ({ mutate: mockCalculateTaxSummary, isPending: false }),
  useFinancialAiAnalysis: vi.fn(),
  useDownloadFinancialAiReport: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock("./FinancialEducation", () => ({ FinancialEducation: () => <div /> }));
vi.mock("./LifeStageGuide", () => ({ LifeStageGuide: () => <div /> }));
vi.mock("./TaxSummaryDialog", () => ({ TaxSummaryDialog: () => <div /> }));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import { useFinancialAiAnalysis, useTaxSummary } from "@/lib/hooks/use-api";

describe("Intelligence — Análisis con IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTaxSummary).mockReturnValue({ data: undefined, isLoading: false } as never);
  });

  it("shows a loading skeleton while the AI analysis is fetching", () => {
    vi.mocked(useFinancialAiAnalysis).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);

    render(<Intelligence />);
    expect(screen.getByText("Análisis con IA")).toBeInTheDocument();
  });

  it("renders narrative, recommendations, provider badge and generated_at date", () => {
    vi.mocked(useFinancialAiAnalysis).mockReturnValue({
      data: {
        narrative: "En este período tus ingresos superaron tus gastos.",
        recommendations: ["Reduce gastos en suscripciones no esenciales."],
        provider: "rule-based",
        generated_at: "2026-09-07T12:00:00.000Z",
      },
      isLoading: false,
      isError: false,
    } as never);

    render(<Intelligence />);

    expect(
      screen.getByText("En este período tus ingresos superaron tus gastos."),
    ).toBeInTheDocument();
    expect(screen.getByText("Reduce gastos en suscripciones no esenciales.")).toBeInTheDocument();
    expect(screen.getByText("rule-based")).toBeInTheDocument();
  });

  it("shows an error message when the AI analysis fails to load", () => {
    vi.mocked(useFinancialAiAnalysis).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);

    render(<Intelligence />);
    expect(
      screen.getByText("No fue posible cargar el análisis con IA en este momento."),
    ).toBeInTheDocument();
  });

  it("triggers the PDF report download when clicking the button", async () => {
    vi.mocked(useFinancialAiAnalysis).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);
    const user = userEvent.setup();

    render(<Intelligence />);
    await user.click(screen.getByRole("button", { name: /descargar reporte pdf/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });
});

describe("Intelligence — Resumen fiscal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFinancialAiAnalysis).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);
  });

  it("calcula el resumen fiscal cuando aún no existe", async () => {
    vi.mocked(useTaxSummary).mockReturnValue({ data: undefined, isLoading: false } as never);
    const user = userEvent.setup();

    render(<Intelligence />);
    await user.click(screen.getByRole("button", { name: /calcular resumen fiscal/i }));

    await waitFor(() => {
      expect(mockCalculateTaxSummary).toHaveBeenCalled();
    });
  });

  it("muestra el botón de editar cuando ya existe un resumen fiscal", () => {
    vi.mocked(useTaxSummary).mockReturnValue({
      data: { id: 1, fiscal_year: 2026, total_income: 0, must_declare: false },
      isLoading: false,
    } as never);

    render(<Intelligence />);

    expect(screen.getByRole("button", { name: /editar resumen fiscal/i })).toBeInTheDocument();
  });
});
