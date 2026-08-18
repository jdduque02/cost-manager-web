import { useState, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const MANUAL_FORMAT = "dd/MM/yyyy";

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function digitsFromDate(value?: Date): string {
  if (!value || !isValid(value)) return "";
  return format(value, "ddMMyyyy");
}

function buildMaskedText(digits: string): string {
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let text = day;
  if (month) text += "/" + month;
  if (year) text += "/" + year;
  return text;
}

interface PartValidity {
  day: boolean;
  month: boolean;
  year: boolean;
}

function validateParts(digits: string): PartValidity {
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return {
    day: day === "" || (Number(day) >= 1 && Number(day) <= 31),
    month: month === "" || (Number(month) >= 1 && Number(month) <= 12),
    year: year === "" || (year.length === 4 && Number(year) >= 1900 && Number(year) <= 2100),
  };
}

function parseFromDigits(digits: string): Date | null {
  if (digits.length !== 8) return null;
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  const masked = `${dd}/${mm}/${yyyy}`;
  const parsed = parse(masked, MANUAL_FORMAT, new Date());
  if (!isValid(parsed)) return null;
  if (format(parsed, MANUAL_FORMAT) !== masked) return null;
  return parsed;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(value ?? new Date());
  const [digits, setDigits] = useState(digitsFromDate(value));
  const [touchedInvalid, setTouchedInvalid] = useState(false);

  useEffect(() => {
    if (value) setMonth(value);
    setDigits(digitsFromDate(value));
    setTouchedInvalid(false);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const next = raw.replace(/\D/g, "").slice(0, 8);
    setDigits(next);

    if (next.length === 0) {
      setTouchedInvalid(false);
      onChange(undefined);
      return;
    }

    const parts = validateParts(next);

    if (next.length === 8) {
      const parsed = parseFromDigits(next);
      const valid = !!parsed && parts.day && parts.month && parts.year;
      setTouchedInvalid(!valid);
      if (valid) onChange(parsed);
    } else {
      setTouchedInvalid(false);
    }
  }

  function handleBlur() {
    if (touchedInvalid) {
      setDigits(digitsFromDate(value));
      setTouchedInvalid(false);
    }
  }

  const invalid = touchedInvalid;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <Input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={buildMaskedText(digits)}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          aria-invalid={invalid}
          className={cn("pr-10", invalid && "border-destructive focus-visible:ring-destructive")}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Abrir calendario"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          month={month}
          onMonthChange={setMonth}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
