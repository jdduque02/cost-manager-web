import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhoneField, isPhoneValid } from "./phone-field";

describe("isPhoneValid", () => {
  it("acepta un celular colombiano real", () => {
    expect(isPhoneValid("+573101234567")).toBe(true);
  });
  it("rechaza numeros incompletos o basura", () => {
    expect(isPhoneValid("+57123")).toBe(false);
    expect(isPhoneValid("abc")).toBe(false);
  });
});

describe("PhoneField", () => {
  it("emite E.164 con +57 por defecto", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhoneField onChange={onChange} />);
    await user.type(screen.getByLabelText("Telefono"), "3101234567");
    expect(onChange).toHaveBeenLastCalledWith("+573101234567");
  });
});
