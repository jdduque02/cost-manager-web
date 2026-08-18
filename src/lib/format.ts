export const fmtCurrency = (n: number, currency = "COP") =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const parseCurrency = (s: string): number => Number(s.replace(/[^0-9.-]/g, "")) || 0;

export const MASKED = "\u2022\u2022\u2022\u2022\u2022\u2022";
