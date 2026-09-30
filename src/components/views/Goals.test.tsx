import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setLocale } from "@/lib/i18n/errors";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { Goals } from "./Goals";
import type { FinancialObjective } from "@/lib/api/finance";

function renderGoals() {
  return render(<Goals />, { wrapper: withNuqsTestingAdapter() });
}

const mockDeleteObjective = { mutate: vi.fn(), isPending: false };

let mockObjectives: Partial<FinancialObjective>[] = [];
let mockObjectivesError: Error | null = null;
const mockRefetch = vi.fn();

vi.mock("@/lib/hooks/use-formatted-amount", () => ({
  useFormattedAmount: () => (v: number) => `$${v}`,
  useAmountsHidden: () => false,
}));

vi.mock("@/lib/hooks/use-api", () => ({
  useObjectives: () => ({
    data: mockObjectives,
    isLoading: false,
    error: mockObjectivesError,
    refetch: mockRefetch,
  }),
  useDeleteObjective: () => mockDeleteObjective,
  useTransactions: () => ({ data: [] }),
  useCategories: () => ({ data: [] }),
}));

vi.mock("./GoalDialog", () => ({
  GoalDialog: () => null,
  GOAL_TYPE_LABELS: {
    savings: "Ahorro",
    loan: "Préstamo",
    goal: "Meta",
    emergency_fund: "Fondo de emergencia",
  },
}));
vi.mock("./TransactionsDetailModal", () => ({ TransactionsDetailModal: () => null }));

function baseGoal(overrides: Partial<FinancialObjective> = {}): FinancialObjective {
  return {
    id: 1,
    user_id: 1,
    name: "Fondo de emergencia",
    target_amount: null,
    current_balance: 0,
    type: "savings",
    start_date: "2024-01-01",
    end_date: undefined,
    is_completed: false,
    created_at: "2024-01-01",
    updated_at: null,
    months_of_expenses_covered: null,
    ...overrides,
  };
}

describe("Goals", () => {
  beforeEach(() => {
    mockObjectives = [];
    mockObjectivesError = null;
    vi.clearAllMocks();
  });

  it("shows a load error with a retry action instead of the empty state", async () => {
    setLocale("es");
    mockObjectivesError = new Error("boom");
    renderGoals();
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las metas.");
    expect(screen.queryByText("No se encontraron metas financieras.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("names the icon-only edit/delete buttons after the goal", () => {
    setLocale("es");
    mockObjectives = [baseGoal({ name: "Viaje" })];
    renderGoals();
    expect(screen.getByRole("button", { name: "Editar: Viaje" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar: Viaje" })).toBeInTheDocument();
  });

  it("shows 'meses de gastos cubiertos' for an emergency_fund goal with a value set", () => {
    mockObjectives = [baseGoal({ type: "emergency_fund", months_of_expenses_covered: 3.456 })];
    renderGoals();
    expect(screen.getByText("3.5 meses de gastos cubiertos")).toBeInTheDocument();
  });

  it("does not show the coverage indicator when months_of_expenses_covered is null", () => {
    mockObjectives = [baseGoal({ type: "emergency_fund", months_of_expenses_covered: null })];
    renderGoals();
    expect(screen.queryByText(/meses de gastos cubiertos/)).not.toBeInTheDocument();
  });

  it("does not show the coverage indicator when months_of_expenses_covered is undefined", () => {
    mockObjectives = [baseGoal({ type: "emergency_fund", months_of_expenses_covered: undefined })];
    renderGoals();
    expect(screen.queryByText(/meses de gastos cubiertos/)).not.toBeInTheDocument();
  });

  it("does not show the coverage indicator for a non emergency_fund goal even with a value set", () => {
    mockObjectives = [baseGoal({ type: "savings", months_of_expenses_covered: 4 })];
    renderGoals();
    expect(screen.queryByText(/meses de gastos cubiertos/)).not.toBeInTheDocument();
  });

  it("shows the 'Fondo de emergencia' badge for an emergency_fund goal type", () => {
    mockObjectives = [
      baseGoal({ name: "Colchón", type: "emergency_fund", months_of_expenses_covered: 2 }),
    ];
    renderGoals();
    expect(screen.getByText("Fondo de emergencia")).toBeInTheDocument();
  });
});
