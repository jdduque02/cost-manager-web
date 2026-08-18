import { useState, useMemo } from "react";
import { Search, X, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { cn } from "@/lib/utils";
import type { TransactionRecord } from "@/lib/api/finance";

const PAGE_SIZE = 10;

function matchesTypeFilter(t: TransactionRecord, typeFilter: string): boolean {
  return typeFilter === "all" || t.type === typeFilter;
}

function matchesSearch(
  t: TransactionRecord,
  query: string,
  categoryMap: Map<number, string>,
): boolean {
  if (!query) return true;
  const description = (t.description ?? "").toLowerCase();
  const category = (categoryMap.get(t.category_id ?? -1) ?? "").toLowerCase();
  return description.includes(query) || category.includes(query);
}

function matchesDateRange(
  t: TransactionRecord,
  fromDate: Date | undefined,
  toDate: Date | undefined,
): boolean {
  const date = t.transaction_date ? new Date(t.transaction_date) : null;
  if (!date) return true;
  if (fromDate && date < new Date(fromDate)) return false;
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

function TxIcon({ type }: { type: TransactionRecord["type"] }) {
  if (type === "income") return <ArrowUp className="h-3.5 w-3.5 text-success" />;
  if (type === "investment") return <TrendingUp className="h-3.5 w-3.5 text-primary" />;
  return <ArrowDown className="h-3.5 w-3.5 text-destructive" />;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "d MMM yyyy");
  } catch {
    return "—";
  }
}

interface TransactionsDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  transactions: TransactionRecord[];
  categoryMap: Map<number, string>;
}

export function TransactionsDetailModal({
  open,
  onOpenChange,
  title,
  subtitle,
  transactions,
  categoryMap,
}: TransactionsDetailModalProps) {
  const fmtAmount = useFormattedAmount();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [page, setPage] = useState(0);

  function resetFilters() {
    setSearch("");
    setTypeFilter("all");
    setFromDate(undefined);
    setToDate(undefined);
    setPage(0);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        matchesTypeFilter(t, typeFilter) &&
        matchesSearch(t, q, categoryMap) &&
        matchesDateRange(t, fromDate, toDate),
    );
  }, [transactions, search, typeFilter, fromDate, toDate, categoryMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetFilters();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por descripción o categoría"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="income">Ingresos</SelectItem>
                  <SelectItem value="expense">Gastos</SelectItem>
                  <SelectItem value="investment">Inversiones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <DatePicker
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d ?? undefined);
                  setPage(0);
                }}
                placeholder="Seleccionar"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <DatePicker
                value={toDate}
                onChange={(d) => {
                  setToDate(d ?? undefined);
                  setPage(0);
                }}
                placeholder="Seleccionar"
              />
            </div>
            {(search || typeFilter !== "all" || fromDate || toDate) && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="justify-start">
                <X className="mr-1 h-3.5 w-3.5" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        <div className="mt-2 max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {pageItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin transacciones que coincidan con los filtros.
            </p>
          ) : (
            pageItems.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <TxIcon type={t.type} />
                  <span className="truncate text-muted-foreground">
                    {t.description ?? categoryMap.get(t.category_id ?? -1) ?? "Sin descripción"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-muted-foreground/70">
                    {formatDate(t.transaction_date)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums font-medium",
                      (() => {
                        if (t.type === "income") return "text-success";
                        if (t.type === "investment") return "text-primary";
                        return "text-destructive";
                      })(),
                    )}
                  >
                    {t.type === "income" || t.type === "investment" ? "+" : "-"}
                    {fmtAmount(t.amount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            {filtered.length === 0
              ? "0 transacciones"
              : `Mostrando ${safePage * PAGE_SIZE + 1}–${Math.min(
                  (safePage + 1) * PAGE_SIZE,
                  filtered.length,
                )} de ${filtered.length}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </Button>
            <span className="tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
