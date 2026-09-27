import { fireEvent, render, screen } from "@testing-library/react";
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

  // es-CO: "." is a thousands separator. Backspace on "1.500" leaves "1.50",
  // which must read as 150 (not 1,50).
  it.each([
    ["1500", "1.50", "150"],
    ["12345", "12.34", "1234"],
    ["1500", "1.500,5", "1500.5"],
  ])("backspace on %s → %s → %s", (initial, typed, expected) => {
    const onChange = vi.fn();
    render(<CurrencyInput value={initial} onChange={onChange} />);
    fireEvent.input(screen.getByRole("textbox"), {
      target: { value: typed },
      inputType: "deleteContentBackward",
    });
    expect(onChange).toHaveBeenLastCalledWith(expected);
  });

  it("keeps an en decimal when pasting or autofilling (USD)", () => {
    const onChange = vi.fn();
    render(<CurrencyInput value="" onChange={onChange} />);
    fireEvent.input(screen.getByRole("textbox"), {
      target: { value: "12.50" },
      inputType: "insertFromPaste",
    });
    expect(onChange).toHaveBeenLastCalledWith("12.50");
  });

  it("treats a just-typed trailing dot as the decimal key (en keyboards / USD)", () => {
    const onChange = vi.fn();
    render(<CurrencyInput value="12" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "12." } });
    expect(onChange).toHaveBeenLastCalledWith("12.");
    expect(input).toHaveValue("12,");
  });
});
