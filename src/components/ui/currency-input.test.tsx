import { render, screen } from "@testing-library/react";
import { CurrencyInput } from "./currency-input";

describe("CurrencyInput", () => {
  it("forwards the id prop to the internal input element", () => {
    render(<CurrencyInput id="foo" value="" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "foo");
  });

  it("associates a Label via htmlFor with the internal input", () => {
    render(
      <div>
        <label htmlFor="amount-field">Monto</label>
        <CurrencyInput id="amount-field" value="" onChange={vi.fn()} />
      </div>,
    );
    expect(screen.getByLabelText("Monto")).toBeInTheDocument();
  });

  it("renders without an id when not provided", () => {
    render(<CurrencyInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input).not.toHaveAttribute("id");
  });

  it("displays the formatted es-CO value", () => {
    render(<CurrencyInput value="48900.5" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("48.900,5")).toBeInTheDocument();
  });
});
