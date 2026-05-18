import { Card, Badge } from "@/components/ui/primitives";
import { fmtCurrency } from "@/lib/format";
import { Search, ShoppingBag, Coffee, Home, Car, Zap, Tag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions } from "@/lib/hooks/use-api";

function getCategoryIcon(category?: string) {
  if (!category) return Tag;
  const c = category.toLowerCase();
  if (c.includes("groceries") || c.includes("shopping")) return ShoppingBag;
  if (c.includes("dining") || c.includes("coffee") || c.includes("restaurant")) return Coffee;
  if (c.includes("housing") || c.includes("rent")) return Home;
  if (c.includes("transport") || c.includes("car")) return Car;
  if (c.includes("utilities") || c.includes("bills")) return Zap;
  return Tag;
}

export function TransactionsList() {
  const { data: transactions, isLoading, error } = useTransactions();

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Todos los movimientos</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Transacciones</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar transacciones…"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary lg:w-80"
          />
        </div>
      </div>

      <Card className="p-0">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-32 items-center justify-center text-destructive text-sm">
            Error al cargar transacciones.
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground text-sm">
            <Tag className="mb-2 h-6 w-6 opacity-50" />
            No se encontraron transacciones.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((t) => {
              const Icon = getCategoryIcon(t.category);
              return (
                <li key={t.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface/60">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    t.type === "INCOME" ? "bg-success/10 text-success" : "bg-surface-2 text-muted-foreground"
                  )}>
                    <Icon className="h-4.5 w-4.5" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p>
                  </div>
                  <Badge tone="muted">{t.category ?? "General"}</Badge>
                  <span className={cn(
                    "w-28 text-right font-display text-base font-semibold tabular-nums",
                    t.type === "INCOME" ? "text-success" : "text-foreground"
                  )}>
                    {t.type === "INCOME" ? "+" : "−"}{fmtCurrency(t.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
