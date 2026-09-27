import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import type { ProductClosure } from "@/lib/api/banking";
import type { StatementImport } from "@/lib/api/statement-imports";
import { setLocale, t } from "@/lib/i18n/errors";
import { ReconcileDialog } from "./ReconcileDialog";

beforeAll(() => setLocale("es"));

const state = vi.hoisted(() => ({
  job: undefined as unknown,
  reconcile: vi.fn(),
  skip: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/hooks/use-formatted-amount", () => ({
  useFormattedAmount: () => (v: number) => `$${v}`,
}));
vi.mock("@/lib/hooks/use-api", () => ({
  useProductClosure: () => ({ data: undefined, refetch: state.refetch }),
  useReconcileProductClosure: () => ({ mutate: state.reconcile, isPending: false }),
  useSkipProductClosure: () => ({ mutate: state.skip, isPending: false }),
  useStatementImportJob: (id: number | null) => ({ data: id ? state.job : undefined }),
}));
// El diálogo de importación real se prueba aparte: aquí solo simula que el lote terminó.
vi.mock("./StatementImportDialog", () => ({
  StatementImportDialog: (p: {
    open: boolean;
    presetAccountId?: number;
    presetLiabilityId?: number;
    onCompleted: (id: number) => void;
  }) =>
    p.open ? (
      <button onClick={() => p.onCompleted(99)}>
        import-terminado cuenta={String(p.presetAccountId)} tarjeta={String(p.presetLiabilityId)}
      </button>
    ) : null,
}));

const closure: ProductClosure = {
  id: 7,
  product_kind: "account",
  product_id: 4,
  period_start: "2026-08-01",
  period_end: "2026-08-31",
  currency: "COP",
  expected_balance: 1180000,
  reported_balance: null,
  difference: null,
  minimum_payment: null,
  total_payment: null,
  status: "pending",
  adjustment_tx_id: null,
};

function job(
  files: Partial<NonNullable<StatementImport["files"]>[number]>[],
  status = "completed",
) {
  return {
    id: 99,
    status,
    total_records_created: 3,
    total_records_skipped: 2,
    files: files.map((f, i) => ({ id: i + 1, status: "success", error_message: null, ...f })),
  };
}

function setup(over: Partial<ProductClosure> = {}) {
  const onClose = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(<ReconcileDialog closure={{ ...closure, ...over }} productName="Nu" onClose={onClose} />);
  return { user, onClose };
}

async function importStatement(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("tab", { name: "Subir extracto" }));
  await user.click(screen.getByRole("button", { name: "Subir extracto PDF" }));
  await user.click(screen.getByRole("button", { name: /import-terminado/ }));
}

describe("ReconcileDialog › Escribir saldo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.job = undefined;
  });

  it("vista previa de la diferencia (real − esperado) y confirmación", async () => {
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText("Saldo real de la cuenta"), "1250000");
    expect(screen.getByText(/Diferencia \(real − esperado\)/)).toHaveTextContent("$70000");
    expect(screen.getByText(/movimiento pendiente por \$70000/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Conciliar" }));
    expect(state.reconcile).toHaveBeenCalledWith(
      { id: 7, dto: { reported_balance: 1250000 } },
      expect.any(Object),
    );
    state.reconcile.mock.calls[0][1].onSuccess({ ...closure, difference: 70000 });
    expect(toast.success).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("diferencia 0: avisa que no se crea movimiento", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("Saldo real de la cuenta"), "1180000");
    expect(screen.getByText(/Sin diferencia/)).toBeInTheDocument();
  });

  it("en tarjetas envía los pagos mínimo y total opcionales", async () => {
    const { user } = setup({ product_kind: "liability" });
    expect(screen.getByText("Deuda esperada en Sprig")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Deuda real según el banco"), "1250000");
    await user.type(screen.getByLabelText("Pago mínimo"), "85000");
    await user.click(screen.getByRole("button", { name: "Conciliar" }));
    expect(state.reconcile.mock.calls[0][0]).toEqual({
      id: 7,
      dto: { reported_balance: 1250000, minimum_payment: 85000 },
    });
  });

  it("en cuentas no muestra los campos de pago", () => {
    setup();
    expect(screen.queryByLabelText("Pago mínimo")).not.toBeInTheDocument();
  });

  it("omitir marca el cierre y cierra; solo aparece en pending", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Omitir" }));
    expect(state.skip).toHaveBeenCalledWith(7, expect.any(Object));
    state.skip.mock.calls[0][1].onSuccess();
    expect(onClose).toHaveBeenCalled();
  });

  it("un cierre omitido se puede conciliar pero no volver a omitir", () => {
    setup({ status: "skipped" });
    expect(screen.queryByRole("button", { name: "Omitir" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conciliar" })).toBeInTheDocument();
  });

  it("error del API: muestra el mensaje traducido y no cierra", async () => {
    const { user, onClose } = setup({ product_kind: "liability" });
    await user.type(screen.getByLabelText("Deuda real según el banco"), "2000000");
    await user.click(screen.getByRole("button", { name: "Conciliar" }));
    state.reconcile.mock.calls[0][1].onError(
      new ApiError("Intenta de nuevo a partir del 2026-10-01", 409),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Intenta de nuevo a partir del 2026-10-01",
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ReconcileDialog › Subir extracto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.job = undefined;
  });

  it("fija el producto del cierre en la importación", async () => {
    const { user } = setup({ product_kind: "liability" });
    await user.click(screen.getByRole("tab", { name: "Subir extracto" }));
    await user.click(screen.getByRole("button", { name: "Subir extracto PDF" }));
    expect(screen.getByRole("button", { name: /import-terminado/ })).toHaveTextContent(
      "cuenta=undefined tarjeta=4",
    );
  });

  it("saldo sugerido: toma closing_balance, recalcula el esperado y muestra el resumen", async () => {
    state.job = job([
      { closing_balance: 1250000, period_from: "2026-08-01", period_to: "2026-08-31" },
    ]);
    const { user } = setup();
    await importStatement(user);

    expect(state.refetch).toHaveBeenCalled();
    expect(screen.getByText(/Saldo final del extracto/)).toHaveTextContent("$1250000");
    expect(screen.getByText("Nuevos").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Omitidos (duplicados)").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Diferencia restante").nextSibling).toHaveTextContent("$70000");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Escribir saldo" }));
    expect(screen.getByLabelText("Saldo real de la cuenta")).toHaveValue("1.250.000");
  });

  it("sin saldo en el extracto: pide escribirlo", async () => {
    state.job = job([{ closing_balance: null, period_from: null, period_to: null }]);
    const { user } = setup({ product_kind: "liability" });
    await importStatement(user);

    expect(screen.getByText(/no trae el saldo final/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Escribir saldo" }));
    expect(screen.getByLabelText("Deuda real según el banco")).toHaveValue("");
  });

  it("periodo que no se cruza con el del cierre: muestra aviso", async () => {
    state.job = job([
      { closing_balance: 900000, period_from: "2026-06-01", period_to: "2026-06-30" },
    ]);
    const { user } = setup();
    await importStatement(user);
    expect(screen.getByRole("status")).toHaveTextContent(/no se cruza con el del cierre/);
  });

  it("job fallido: muestra el error y no toca el cierre", async () => {
    state.job = job(
      [{ status: "failed", error_message: "El PDF está protegido con contraseña" }],
      "failed",
    );
    const { user } = setup();
    await importStatement(user);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(t("err.closure.import"));
    expect(alert).toHaveTextContent("El PDF está protegido con contraseña");
    expect(state.refetch).not.toHaveBeenCalled();
    expect(state.reconcile).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Intentar con otro extracto" })).toBeInTheDocument();
  });
});
