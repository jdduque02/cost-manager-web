import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

/**
 * Normalize display/user input into a raw amount:
 * digits + optional "." decimal (max 2 places). No thousand separators.
 *
 * Display uses es-CO ("." thousands, "," decimal). While typing, the browser
 * sends the formatted string back (e.g. "4.890" + "0" → "4.8900"), so dots
 * must be treated as thousands unless they clearly mark a decimal.
 */
function parseUserInput(input: string): string {
  if (!input) return "";

  // Comma = decimal (es-CO keyboard / explicit decimal)
  if (input.includes(",")) {
    let s = input.replace(/[^0-9.,]/g, "");
    s = s.replace(/\./g, "");
    const i = s.indexOf(",");
    const intPart = s.slice(0, i).replace(/\D/g, "");
    const decPart = s
      .slice(i + 1)
      .replace(/\D/g, "")
      .slice(0, 2);
    if (!intPart && !decPart) return "";
    return `${intPart || "0"}.${decPart}`;
  }

  const s = input.replace(/[^0-9.]/g, "");
  if (!s) return "";

  const parts = s.split(".");
  if (parts.length === 1) return parts[0];

  // Multiple dots → thousand separators only (1.234.567)
  if (parts.length > 2) return parts.join("");

  // Single dot: "4.8900" (continue typing after thousands) vs "4.99" (decimal)
  const after = parts[1] ?? "";
  if (after.length >= 3) {
    // 3+ digits after one dot → thousands (48.900 / 4.8900)
    return parts[0] + after;
  }
  // 0–2 digits → decimal (4.9 / 4.99 / "12.")
  return parts[0] + "." + after.slice(0, 2);
}

/** Format raw amount for es-CO display. */
function formatDisplay(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return "";

  const dot = cleaned.indexOf(".");
  const intPart = (dot === -1 ? cleaned : cleaned.slice(0, dot)) || "0";
  const hasDecimal = dot !== -1;
  const decPart = hasDecimal ? cleaned.slice(dot + 1).slice(0, 2) : "";

  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (hasDecimal) return `${withThousands},${decPart}`;
  return withThousands;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  min,
  disabled,
  required,
  id,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatDisplay(value));

  useEffect(() => {
    setDisplayValue(formatDisplay(value));
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseUserInput(e.target.value);
      setDisplayValue(formatDisplay(raw));
      onChange(raw);
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    setDisplayValue(formatDisplay(value));
  }, [value]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        min={min}
        disabled={disabled}
        required={required}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent pl-7 pr-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        )}
      />
    </div>
  );
}
