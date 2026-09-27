import { useCallback } from "react";
import { useVisibility } from "@/lib/visibility-context";
import { fmtCurrency, MASKED } from "@/lib/format";

/** true cuando el usuario activó "Ocultar montos". */
export function useAmountsHidden() {
  return useVisibility().hidden;
}

/**
 * Hook that returns a function to format a financial amount,
 * enmascarado cuando el usuario activó "Ocultar montos".
 */
export function useFormattedAmount() {
  const hidden = useAmountsHidden();

  const format = useCallback(
    (value: number, opts?: { prefix?: string; suffix?: string; currency?: string }) => {
      if (hidden) return MASKED;
      const prefix = opts?.prefix ?? "";
      const suffix = opts?.suffix ?? "";
      return `${prefix}${fmtCurrency(value, opts?.currency ?? "COP")}${suffix}`;
    },
    [hidden],
  );

  return format;
}
