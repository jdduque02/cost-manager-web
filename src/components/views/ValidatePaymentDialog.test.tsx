import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ValidatePaymentDialog } from "./ValidatePaymentDialog";
import type { TransactionRecord } from "@/lib/api/finance";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const mockValidate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ userId: "u1" }) }));
vi.mock("@/lib/api/finance", () => ({ recurringApi: { validate: mockValidate } }));

const tx = { id: 42, amount: 1200000, description: "Arriendo" } as TransactionRecord;
const fmt = (d: Date) => format(d, "yyyy-MM-dd");

function renderDialog() {
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ValidatePaymentDialog transaction={tx} onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

describe("ValidatePaymentDialog", () => {
  beforeEach(() => mockValidate.mockReset().mockResolvedValue({}));

  it("sin fecha no envía", async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("Fecha del pago"), { target: { value: "" } });
    const submit = screen.getByRole("button", { name: "Validar" });
    expect(submit).toBeDisabled();
    await userEvent.click(submit);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("una fecha futura no se acepta", async () => {
    renderDialog();
    const input = screen.getByLabelText("Fecha del pago");
    expect(input).toHaveAttribute("max", fmt(new Date()));
    fireEvent.change(input, { target: { value: fmt(addDays(new Date(), 2)) } });
    expect(screen.getByRole("button", { name: "Validar" })).toBeDisabled();
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("envía fecha y monto con el id de la fila", async () => {
    const onClose = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Validar" }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockValidate).toHaveBeenCalledWith("u1", 42, {
      transaction_date: fmt(new Date()),
      amount: 1200000,
    });
  });

  it("muestra la moneda del movimiento cuando no es COP", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ValidatePaymentDialog transaction={{ ...tx, currency: "USD" }} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText("Monto (USD)")).toBeInTheDocument();
  });
});
