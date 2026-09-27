import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddressFields, buildAddress } from "./address-fields";

describe("buildAddress", () => {
  it("serializa via, ciudad y departamento", () => {
    expect(
      buildAddress({
        streetType: "Cra",
        road: "10",
        cross: "5",
        number: "20",
        city: "Bogotá",
        departmentName: "Bogotá D.C.",
      }),
    ).toBe("Cra 10 # 5-20, Bogotá, Bogotá D.C.");
  });

  it("devuelve vacio sin datos", () => {
    expect(
      buildAddress({
        streetType: "Cl",
        road: "",
        cross: "",
        number: "",
        city: "",
        departmentName: "",
      }),
    ).toBe("");
  });
});

describe("AddressFields", () => {
  it("deshabilita ciudad hasta elegir departamento y la filtra por departamento", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AddressFields onChange={onChange} />);
    const city = screen.getByLabelText("Ciudad");
    expect(city).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Departamento"), "Valle del Cauca");
    expect(city).toBeEnabled();
    expect(screen.getByRole("option", { name: "Cali" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Medellín" })).not.toBeInTheDocument();
    await user.selectOptions(city, "Cali");
    expect(onChange).toHaveBeenLastCalledWith("Cali, Valle del Cauca");
  });

  it("reinicia la ciudad al cambiar de departamento", async () => {
    const user = userEvent.setup();
    render(<AddressFields onChange={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText("Departamento"), "Antioquia");
    await user.selectOptions(screen.getByLabelText("Ciudad"), "Medellín");
    await user.selectOptions(screen.getByLabelText("Departamento"), "Atlántico");
    expect(screen.getByLabelText("Ciudad")).toHaveValue("");
  });
});
