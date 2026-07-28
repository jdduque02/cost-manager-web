import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  disabled?: boolean;
  required?: boolean;
}

function formatDisplay(raw: string): string {
  if (!raw) return "";
  const clean = raw.replace(/[^0-9]/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  min,
  disabled,
  required,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatDisplay(value));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const clean = raw.replace(/[^0-9]/g, "");
      setDisplayValue(clean ? formatDisplay(clean) : "");
      onChange(clean);
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
