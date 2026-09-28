import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { t } from "@/lib/i18n/errors";
import {
  availableCredit,
  type FinancialAsset,
  type BankAccount,
  type FinancialLiability,
} from "@/lib/api/banking";
import { WealthDialog } from "./WealthDialog";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Toda mutación falla: el diálogo debe manejar el error con `mutate` + onError.
const mockMutate = vi.hoisted(() =>
  vi.fn((_vars: unknown, opts: { onError: (e: Error) => void }) => opts.onError(new Error("x"))),
);

vi.mock("@/lib/hooks/use-api", () => {
  const noop = () => ({ mutate: mockMutate, isPending: false });
  return {
    useCreateBankAccount: noop,
    useUpdateBankAccount: noop,
    useCreateFinancialAsset: noop,
    useUpdateFinancialAsset: noop,
    useCreateFinancialLiability: noop,
    useUpdateFinancialLiability: noop,
  };
});

describe("WealthDialog", () => {
  const defaultProps = { open: true, onOpenChange: vi.fn() };

  const liability = (over: Partial<FinancialLiability>): FinancialLiability => ({
    id: 5,
    user_id: 1,
    liability_type: "tarjeta_credito",
    name: "Visa",
    current_balance: 300000,
    currency: "COP",
    created_at: "2026-01-01",
    updated_at: null,
    ...over,
  });

  const lastDto = (): Record<string, unknown> =>
    (mockMutate.mock.calls[0][0] as { dto: Record<string, unknown> }).dto;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["account", { Banco: "Nu", Saldo: "1000" }, "err.register.create"],
    ["asset", { Nombre: "CDT", "Valor actual": "1000" }, "err.asset.create"],
    ["liability", { Nombre: "Visa", "Saldo actual": "1000" }, "err.debt.create"],
  ] as const)(
    "creates a %s with mutate and toasts the error",
    async (entityType, fields, errKey) => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<WealthDialog {...defaultProps} entityType={entityType} />);
      for (const [label, value] of Object.entries(fields)) {
        await user.type(screen.getByLabelText(label), value);
      }
      await user.click(screen.getByRole("button", { name: "Crear" }));

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(t(errKey));
      expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);
    },
  );

  it("renders create dialog for an account", () => {
    render(<WealthDialog {...defaultProps} entityType="account" />);
    expect(screen.getByText("Nueva Cuenta")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<WealthDialog {...defaultProps} entityType="account" open={false} />);
    expect(screen.queryByText("Nueva Cuenta")).not.toBeInTheDocument();
  });

  it("associates account fields with their labels via id", () => {
    render(<WealthDialog {...defaultProps} entityType="account" />);
    expect(screen.getByLabelText("Banco")).toBeInTheDocument();
    expect(screen.getByLabelText("Saldo")).toBeInTheDocument();
  });

  it("renders create dialog for an asset", () => {
    render(<WealthDialog {...defaultProps} entityType="asset" />);
    expect(screen.getByText("Nuevo Activo")).toBeInTheDocument();
  });

  it("associates asset fields with their labels via id", () => {
    render(<WealthDialog {...defaultProps} entityType="asset" />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Valor actual")).toBeInTheDocument();
  });

  it("renders create dialog for a liability", () => {
    render(<WealthDialog {...defaultProps} entityType="liability" />);
    expect(screen.getByText("Nueva Deuda")).toBeInTheDocument();
  });

  it("associates liability fields with their labels via id", () => {
    render(<WealthDialog {...defaultProps} entityType="liability" />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Saldo actual")).toBeInTheDocument();
  });

  describe("campos solo para tarjeta", () => {
    it("muestra cupo, día de corte y día de pago en una tarjeta y los envía", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(
        <WealthDialog
          {...defaultProps}
          entityType="liability"
          entity={liability({ credit_limit: 2000000, statement_day: 15, payment_due_day: 5 })}
        />,
      );
      expect(screen.getByLabelText("Cupo total")).toHaveValue("2.000.000");
      expect(screen.getByLabelText("Día de corte")).toHaveValue(15);
      const dueDay = screen.getByLabelText("Día límite de pago");
      await user.clear(dueDay);
      await user.click(screen.getByRole("button", { name: "Actualizar" }));

      expect(mockMutate.mock.calls[0][0]).toMatchObject({
        dto: { credit_limit: 2000000, statement_day: 15, payment_due_day: null },
      });
    });

    it("no muestra ni envía los campos de tarjeta en otro tipo de pasivo", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(
        <WealthDialog
          {...defaultProps}
          entityType="liability"
          entity={liability({ liability_type: "credito_consumo", name: "Libre inversión" })}
        />,
      );
      expect(screen.queryByLabelText("Cupo total")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Día de corte")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Actualizar" }));

      const { dto } = mockMutate.mock.calls[0][0] as { dto: Record<string, unknown> };
      expect(dto).not.toHaveProperty("credit_limit");
      expect(dto).not.toHaveProperty("statement_day");
      expect(dto).not.toHaveProperty("payment_due_day");
    });
  });

  describe("saldo inicial no negativo", () => {
    // Regresión del 400 IS_MIN: CurrencyInput borra el "-", así que un saldo negativo en BD se veía
    // positivo en pantalla y se reenviaba negativo al guardar sin tocar el campo.
    it.each([
      ["negativo", -150000, "0", 0],
      ["cero", 0, "0", 0],
      ["positivo", 300000, "300.000", 300000],
    ] as const)(
      "siembra y envía un saldo %s al editar un pasivo",
      async (_caso, currentBalance, shown, enviado) => {
        const user = userEvent.setup({ pointerEventsCheck: 0 });
        render(
          <WealthDialog
            {...defaultProps}
            entityType="liability"
            entity={liability({ current_balance: currentBalance })}
          />,
        );
        await user.click(screen.getByRole("button", { name: "Actualizar" }));

        expect(lastDto()).toMatchObject({ current_balance: enviado });
        expect(screen.getByLabelText("Saldo actual")).toHaveValue(shown);
      },
    );

    it("siembra y envía un saldo no negativo al editar una cuenta", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(
        <WealthDialog
          {...defaultProps}
          entityType="account"
          entity={{ bank_name: "Nu", display_balance: "-150000" } as BankAccount}
        />,
      );
      expect(screen.getByLabelText("Saldo")).toHaveValue("0");
      await user.click(screen.getByRole("button", { name: "Actualizar" }));

      expect(lastDto()).toMatchObject({ balance: 0 });
    });

    it("siembra y envía un saldo no negativo al editar un activo", async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(
        <WealthDialog
          {...defaultProps}
          entityType="asset"
          entity={{ asset_type: "acciones", name: "CDT", current_value: -150000 } as FinancialAsset}
        />,
      );
      expect(screen.getByLabelText("Valor actual")).toHaveValue("0");
      await user.click(screen.getByRole("button", { name: "Actualizar" }));

      expect(lastDto()).toMatchObject({ current_value: 0 });
    });
  });

  describe("cálculo del cupo disponible", () => {
    const card = { current_balance: 300000 } as FinancialLiability;
    it("es cupo − saldo actual", () => {
      expect(availableCredit({ ...card, credit_limit: 2000000 })).toBe(1700000);
    });
    it("puede ser negativo si la deuda supera el cupo", () => {
      expect(availableCredit({ ...card, credit_limit: 100000 })).toBe(-200000);
    });
    it("es null sin cupo registrado", () => {
      expect(availableCredit({ ...card, credit_limit: null })).toBeNull();
    });
  });
});
