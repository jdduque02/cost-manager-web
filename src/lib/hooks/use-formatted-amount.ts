import { useCallback } from "react";
import { useVisibility } from "@/lib/visibility-context";
import { fmtCurrency, MASKED } from "@/lib/format";

/**
 * Hook that returns a function to format a financial amount
 * based on the current visibility mode (visible, masked, encrypted).
 */
export function useFormattedAmount() {
  const { mode } = useVisibility();

  const format = useCallback(
    (value: number, opts?: { prefix?: string; suffix?: string }) => {
      if (mode === "visible") {
        const prefix = opts?.prefix ?? "";
        const suffix = opts?.suffix ?? "";
        return `${prefix}${fmtCurrency(value)}${suffix}`;
      }
      // masked or encrypted — show dots
      return MASKED;
    },
    [mode],
  );

  return format;
}
