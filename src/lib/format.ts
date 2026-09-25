export const fmtCurrency = (n: number, currency = "COP") =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: n % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Parses plain ("48900"), US ("48900.50") or es-CO ("48.900" / "48.900,50") amounts. */
export const parseCurrency = (s: string): number => {
  const t = s.trim();
  if (!t) return 0;
  const cleaned = t.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return 0;

  let n: string;
  if (cleaned.includes(",")) {
    // es-CO: "." thousands, "," decimal
    n = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = (cleaned.match(/\./g) ?? []).length;
    if (dots > 1) {
      // Multiple dots → thousand separators (e.g. 1.234.567)
      n = cleaned.replace(/\./g, "");
    } else if (dots === 1) {
      const after = cleaned.split(".")[1] ?? "";
      // Exactly 3 digits after single dot → es-CO thousands (48.900 → 48900)
      n = after.length === 3 ? cleaned.replace(".", "") : cleaned;
    } else {
      n = cleaned;
    }
  }

  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

export const MASKED = "\u2022\u2022\u2022\u2022\u2022\u2022";

/** localStorage: preferencia de UI "Ocultar montos" (no es un dato sensible). */
export const HIDE_AMOUNTS_KEY = "cm:hide-amounts";

/**
 * Whether a proposed amount would exceed the available balance of the
 * source account/liability. Balances <= 0 are treated as "unknown" (e.g.
 * not loaded yet) rather than insufficient, matching the existing
 * transfer/clone dialogs' behavior.
 */
export const isInsufficientBalance = (amount: number, balance: number): boolean =>
  amount > 0 && balance > 0 && amount > balance;
