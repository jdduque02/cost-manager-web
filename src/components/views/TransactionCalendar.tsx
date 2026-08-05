import { useMemo, useState } from "react";
import { DayPicker, DayButton, getDefaultClassNames } from "react-day-picker";
import { es } from "date-fns/locale";
import { CalendarDays, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import type { TransactionRecord } from "@/lib/api/finance";

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DayRollup {
  income: number;
  expenses: number;
  count: number;
}

interface TransactionCalendarProps {
  transactions: TransactionRecord[];
  categoryMap: Record<number, string>;
  getLinkedLabel?: (t: TransactionRecord) => string | null;
  onNewTransaction: (date: Date) => void;
  onEdit: (tx: TransactionRecord) => void;
  onDelete: (tx: TransactionRecord) => void;
}

export function TransactionCalendar({
  transactions,
  categoryMap,
  getLinkedLabel,
  onNewTransaction,
  onEdit,
  onDelete,
}: TransactionCalendarProps) {
  const fmtAmount = useFormattedAmount();
  const today = new Date();
  const [month, setMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState<Date>(today);

  const dayRollups = useMemo(() => {
    const map = new Map<string, DayRollup>();
    for (const t of transactions) {
      const key = t.transaction_date?.slice(0, 10);
      if (!key) continue;
      const r = map.get(key) ?? { income: 0, expenses: 0, count: 0 };
      if (t.type === "income") r.income += t.amount;
      else if (t.type === "expense") r.expenses += t.amount;
      r.count += 1;
      map.set(key, r);
    }
    return map;
  }, [transactions]);

  const selectedKey = toDateKey(selected);

  const dayTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_date?.slice(0, 10) === selectedKey)
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [transactions, selectedKey]);

  const selectedRollup = dayRollups.get(selectedKey);

  const defaultClassNames = getDefaultClassNames();

  const components = useMemo(
    () => ({
      DayButton: ({
        className,
        day,
        modifiers,
        children,
        ...props
      }: React.ComponentProps<typeof DayButton>) => {
        const key = toDateKey(day.date);
        const info = dayRollups.get(key);
        const outside = !!modifiers.outside;
        return (
          <button
            type="button"
            aria-selected={modifiers.selected}
            className={cn(
              "relative flex aspect-square h-auto w-full min-w-(--cell-size) flex-col items-center justify-center rounded-md text-sm font-normal leading-none transition",
              outside && "text-muted-foreground opacity-40",
              modifiers.selected
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-surface-2",
              modifiers.today && !modifiers.selected && "ring-1 ring-primary/40",
              defaultClassNames.day,
              className,
            )}
            {...props}
          >
            <span>{children}</span>
            {info && info.count > 0 && (
              <span className="pointer-events-none absolute bottom-1 flex items-center gap-0.5">
                {info.income > 0 && (
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      modifiers.selected ? "bg-primary-foreground" : "bg-success",
                    )}
                  />
                )}
                {info.expenses > 0 && (
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      modifiers.selected ? "bg-primary-foreground" : "bg-destructive",
                    )}
                  />
                )}
              </span>
            )}
          </button>
        );
      },
    }),
    [dayRollups, defaultClassNames],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Resumen visual</p>
            <h3 className="font-display text-lg font-semibold">Calendario</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setSelected(now);
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Hoy
          </Button>
        </div>
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(d) => d && setSelected(d)}
          month={month}
          onMonthChange={setMonth}
          locale={es}
          showOutsideDays
          className="bg-background w-full p-3 [--cell-size:2.25rem]"
          classNames={{
            root: defaultClassNames.root,
            months: cn("relative flex w-full flex-col", defaultClassNames.months),
            month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
            nav: cn(
              "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
              defaultClassNames.nav,
            ),
            button_previous: cn(
              "h-(--cell-size) w-(--cell-size) cursor-pointer select-none rounded-md p-0 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground aria-disabled:opacity-50",
              defaultClassNames.button_previous,
            ),
            button_next: cn(
              "h-(--cell-size) w-(--cell-size) cursor-pointer select-none rounded-md p-0 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground aria-disabled:opacity-50",
              defaultClassNames.button_next,
            ),
            month_caption: cn(
              "flex h-(--cell-size) w-full items-center justify-center text-sm font-medium",
              defaultClassNames.month_caption,
            ),
            table: "w-full border-collapse",
            weekdays: cn("flex", defaultClassNames.weekdays),
            weekday: cn(
              "text-muted-foreground flex-1 select-none text-[0.7rem] uppercase",
              defaultClassNames.weekday,
            ),
            week: cn("mt-2 flex w-full", defaultClassNames.week),
            day: cn(
              "relative aspect-square h-full w-full select-none p-0 text-center",
              defaultClassNames.day,
            ),
            outside: cn(
              "text-muted-foreground aria-selected:text-muted-foreground",
              defaultClassNames.outside,
            ),
            hidden: cn("invisible", defaultClassNames.hidden),
          }}
          components={components}
        />
      </Card>

      <Card className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {selected.toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold capitalize">
              {selected.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
            </h3>
          </div>
          <Button
            size="sm"
            onClick={() => onNewTransaction(selected)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        </div>

        {selectedRollup && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-success/10 p-3">
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <p className="mt-1 font-display text-base font-semibold text-success tabular-nums">
                {fmtAmount(selectedRollup.income)}
              </p>
            </div>
            <div className="rounded-xl bg-destructive/10 p-3">
              <p className="text-xs text-muted-foreground">Gastos</p>
              <p className="mt-1 font-display text-base font-semibold text-destructive tabular-nums">
                {fmtAmount(selectedRollup.expenses)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex-1 space-y-1.5">
          {dayTransactions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <CalendarDays className="mb-2 h-6 w-6 opacity-50" />
              <p className="text-sm">Sin transacciones este día</p>
            </div>
          ) : (
            dayTransactions.map((t) => {
              const categoryName = categoryMap[t.category_id] ?? "General";
              return (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-surface/50 px-3 py-2.5 transition hover:bg-surface"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.description ?? "Sin descripcion"}
                    </p>
                    <p className="text-xs text-muted-foreground">{categoryName}</p>
                    {getLinkedLabel?.(t) && (
                      <Badge tone="primary" className="mt-1">
                        {getLinkedLabel(t)}
                      </Badge>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      t.type === "income"
                        ? "text-success"
                        : t.type === "investment"
                          ? "text-primary"
                          : "text-foreground",
                    )}
                  >
                    {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}
                    {fmtAmount(t.amount)}
                  </span>
                  <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => onEdit(t)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(t)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedRollup && selectedRollup.count > 1 && (
          <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {selectedRollup.count} transacciones · Balance{" "}
            {fmtAmount(selectedRollup.income - selectedRollup.expenses)}
          </p>
        )}
      </Card>
    </div>
  );
}
