import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { isValidPhoneNumber } from "libphonenumber-js/min";

/** Valida un numero E.164 real. Vacio (solo prefijo) se considera "sin telefono". */
export function isPhoneValid(value: string): boolean {
  try {
    return isValidPhoneNumber(value);
  } catch {
    return false;
  }
}

interface PhoneFieldProps {
  onChange: (e164: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}

export function PhoneField({ onChange, invalid, disabled }: PhoneFieldProps) {
  return (
    <PhoneInput
      defaultCountry="co"
      onChange={(phone, meta) =>
        // Solo prefijo de pais (sin numero nacional) equivale a "sin telefono".
        onChange(phone.replace(/\D/g, "") === meta.country.dialCode ? "" : phone)
      }
      disabled={disabled}
      className="sprig-phone"
      inputStyle={{ height: "42px" }}
      inputClassName={`!w-full !rounded-r-xl !border-border !bg-background !text-sm !text-foreground ${
        invalid ? "!border-destructive" : ""
      }`}
      countrySelectorStyleProps={{
        buttonStyle: { height: "42px" },
        buttonClassName: "!rounded-l-xl !border-border !bg-background",
        dropdownStyleProps: { className: "!bg-popover !text-popover-foreground" },
      }}
      inputProps={{ "aria-label": "Telefono", placeholder: "310 123 4567" }}
    />
  );
}
