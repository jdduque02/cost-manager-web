import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecurringDialog } from "./RecurringDialog";
import type { RecurringTransaction } from "@/lib/api/finance";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ userId: "u1" }) }));

vi.mock("@/lib/api/finance", () => ({
  recurringApi: { create: mockCreate, update: mockUpdate },
}));

vi.mock("@/lib/hooks/use-api", () => ({
  useCategories: () => ({ data: [{ id: 5, name: "Vivienda", group_type: "expense" }] }),
  useBankAccounts: () => ({
    data: [
      { id: 1, bank_name: "Bancolombia", masked_account_number: "****1234", currency: "COP" },
      { id: 2, bank_name: "Davivienda", masked_account_number: "****5678", currency: "COP" },
    ],
  }),
  useFinancialLiabilities: () => ({
    data: [
      { id: 9, name: "Crédito carro", currency: "COP" },
      { id: 10, name: "Tarjeta dólares", currency: "USD" },
    ],
  }),
}));

const rule = (over: Partial<RecurringTransaction>): RecurringTransaction => ({
  id: 7,
  name: "Arriendo",
  type: "expense",
  amount: 1200000,
  currency: "COP",
  category_id: null,
  subcategory_id: null,
  account_id: null,
  liability_id: null,
  origin_account_id: null,
  destination_account_id: null,
  destination_liability_id: null,
  payment_method: null,
  frequency: "monthly",
  start_date: "2026-10-01",
  next_due_date: "2026-11-01",
  end_date: null,
  max_occurrences: null,
  occurrences_count: 1,
  remaining_occurrences: null,
  mode: "confirm",
  reminder_days: 1,
  status: "active",
  pending_validation_count: 0,
  created_at: "2026-10-01",
  ...over,
});

function renderDialog(recurring?: RecurringTransaction) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RecurringDialog open onOpenChange={vi.fn()} recurring={recurring} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

async function pick(user: ReturnType<typeof userEvent.setup>, label: string, option: RegExp) {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole("option", { name: option }));
}

const save = () => screen.getByRole("button", { name: "Guardar" });

describe("RecurringDialog", () => {
  beforeEach(() => {
    mockCreate.mockReset().mockResolvedValue({ id: 1 });
    mockUpdate.mockReset().mockResolvedValue({ id: 7 });
  });

  it("bloquea fecha final y N veces juntos: solo envía el fin elegido", async () => {
    const user = renderDialog();
    await user.type(screen.getByLabelText("Nombre"), "Arriendo");
    await user.type(screen.getByLabelText("Monto"), "1200000");
    await pick(user, "Cuenta o pasivo", /Bancolombia/);

    await user.click(screen.getByRole("button", { name: "Fecha final" }));
    fireEvent.change(screen.getByLabelText("Fecha final"), { target: { value: "2030-01-01" } });
    await user.click(screen.getByRole("button", { name: "N veces" }));

    expect(screen.queryByLabelText("Fecha final")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Número de veces"), "12");
    await user.click(save());

    const dto = mockCreate.mock.calls[0][1];
    expect(dto).toMatchObject({ type: "expense", account_id: 1, max_occurrences: 12 });
    expect(dto).not.toHaveProperty("end_date");
  });

  it("bloquea monto 0", async () => {
    const user = renderDialog();
    await user.type(screen.getByLabelText("Nombre"), "Spotify");
    await user.type(screen.getByLabelText("Monto"), "0");
    await pick(user, "Cuenta o pasivo", /Bancolombia/);

    expect(save()).toBeDisabled();
    expect(screen.getByText(/un monto mayor a 0/)).toBeInTheDocument();
  });

  it("el pago de deuda exige pasivo", async () => {
    const user = renderDialog();
    await user.click(screen.getByRole("button", { name: "Pago de deuda" }));
    await user.type(screen.getByLabelText("Nombre"), "Cuota carro");
    await user.type(screen.getByLabelText("Monto"), "850000");
    await pick(user, "Cuenta de origen", /Bancolombia/);

    expect(save()).toBeDisabled();
    expect(screen.getByText(/el pasivo a pagar/)).toBeInTheDocument();

    await pick(user, "Pasivo a pagar", /Crédito carro/);
    await user.click(save());

    expect(mockCreate.mock.calls[0][1]).toMatchObject({
      type: "transfer",
      origin_account_id: 1,
      destination_liability_id: 9,
      reminder_days: 1,
    });
  });

  describe("moneda del ingreso", () => {
    it("gasto: no ofrece moneda, es la del producto", () => {
      renderDialog();
      expect(screen.queryByLabelText("Moneda")).not.toBeInTheDocument();
      expect(screen.getByText(/La moneda es la de la cuenta o el pasivo/)).toBeInTheDocument();
    });

    it("ingreso: por defecto la del producto, sin nota de tasa", async () => {
      const user = renderDialog();
      await user.click(screen.getByRole("button", { name: "Ingreso" }));
      await user.type(screen.getByLabelText("Nombre"), "Nómina");
      await user.type(screen.getByLabelText("Monto"), "3000000");
      await pick(user, "Cuenta o pasivo", /Bancolombia/);

      expect(screen.getByLabelText("Moneda")).toHaveTextContent("COP");
      expect(screen.queryByText(/tu banco puede usar otra tasa/)).not.toBeInTheDocument();
      await user.click(save());
      expect(mockCreate.mock.calls[0][1]).toMatchObject({ type: "income", currency: "COP" });
    });

    it("ingreso en USD sobre cuenta COP: avisa la TRM y envía currency", async () => {
      const user = renderDialog();
      await user.click(screen.getByRole("button", { name: "Ingreso" }));
      await user.type(screen.getByLabelText("Nombre"), "Freelance");
      await user.type(screen.getByLabelText("Monto"), "500");
      await pick(user, "Cuenta o pasivo", /Bancolombia/);
      await pick(user, "Moneda", /^USD$/);

      expect(screen.getByText(/aprox\.; tu banco puede usar otra tasa/)).toBeInTheDocument();
      await user.click(save());
      expect(mockCreate.mock.calls[0][1]).toMatchObject({
        type: "income",
        account_id: 1,
        currency: "USD",
      });
    });

    it("el prefijo del monto sigue la moneda: US$ en USD, $ en COP", async () => {
      const user = renderDialog();
      await user.click(screen.getByRole("button", { name: "Ingreso" }));
      await pick(user, "Cuenta o pasivo", /Bancolombia/);
      expect(screen.getByText("$")).toBeInTheDocument();

      await pick(user, "Moneda", /^USD$/);
      expect(screen.getByText("US$")).toBeInTheDocument();
      expect(screen.queryByText("$")).not.toBeInTheDocument();
    });

    it("gasto sobre un pasivo en USD muestra US$", async () => {
      const user = renderDialog();
      await pick(user, "Cuenta o pasivo", /Tarjeta dólares/);
      expect(screen.getByText("US$")).toBeInTheDocument();
    });

    it("editar un ingreso conserva su moneda aunque la cuenta sea otra", async () => {
      const user = renderDialog(rule({ type: "income", currency: "USD", account_id: 1 }));
      expect(screen.getByLabelText("Moneda")).toHaveTextContent("USD");
      await user.click(screen.getByRole("button", { name: "Actualizar" }));
      expect(mockUpdate.mock.calls[0][2]).toMatchObject({ currency: "USD" });
    });
  });

  describe("edición", () => {
    const update = () => screen.getByRole("button", { name: "Actualizar" });

    it("quitar la categoría envía category_id y subcategory_id en null", async () => {
      const user = renderDialog(rule({ account_id: 1, category_id: 5, subcategory_id: 3 }));
      await user.click(screen.getByLabelText("Categoría"));
      await user.click(await screen.findByRole("option", { name: /Vivienda/ }));
      await user.click(update());

      expect(mockUpdate.mock.calls[0][2]).toMatchObject({
        category_id: null,
        subcategory_id: null,
      });
    });

    it("una regla adoptada sin cuenta ni pasivo se edita sin exigirlos ni enviarlos", async () => {
      const user = renderDialog(rule({}));
      expect(screen.queryByText(/^Falta:/)).not.toBeInTheDocument();

      await user.clear(screen.getByLabelText("Monto"));
      await user.type(screen.getByLabelText("Monto"), "1300000");
      await user.click(update());

      const dto = mockUpdate.mock.calls[0][2];
      expect(dto).toMatchObject({ amount: 1300000 });
      expect(dto).not.toHaveProperty("account_id");
      expect(dto).not.toHaveProperty("liability_id");
    });

    it("transferencia: el origen no ofrece la cuenta destino fija", async () => {
      const user = renderDialog(
        rule({ type: "transfer", origin_account_id: 1, destination_account_id: 2 }),
      );
      await user.click(screen.getByLabelText("Cuenta de origen"));

      expect(await screen.findAllByRole("option")).toHaveLength(1);
      expect(screen.queryByRole("option", { name: /Davivienda/ })).not.toBeInTheDocument();
    });

    it("transferencia: bloquea guardar si origen y destino coinciden", () => {
      renderDialog(rule({ type: "transfer", origin_account_id: 2, destination_account_id: 2 }));

      expect(update()).toBeDisabled();
      expect(screen.getByText(/una cuenta destino distinta/)).toBeInTheDocument();
    });
  });
});
