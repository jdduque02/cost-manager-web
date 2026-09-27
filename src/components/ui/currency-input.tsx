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
 * Display is es-CO ("." thousands, "," decimal). A single "." followed by 0–2
 * digits is still read as a decimal (en keyboard / pasted USD "12.50"), except
 * while deleting: backspace on "1.500" leaves "1.50", which must stay 150.
 */
function parseUserInput(input: string, deleting = false): string {
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
  const digits = s.replace(/\./g, "");
  if (!digits) return "";
  const [intPart, decPart, ...rest] = s.split(".");
  if (!deleting && decPart !== undefined && !rest.length && decPart.length <= 2) {
    return `${intPart}.${decPart}`;
  }
  return digits;
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
      const inputType = (e.nativeEvent as InputEvent).inputType ?? "";
      const raw = parseUserInput(e.target.value, inputType.startsWith("delete"));
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
