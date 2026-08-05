import { useState, useMemo } from "react";
import { Card, Badge } from "@/components/ui/primitives";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import {
  Search,
  ShoppingBag,
  Coffee,
  Home,
  Car,
  Zap,
  Tag,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTransactions,
  useCategories,
  useDeleteTransaction,
  useObjectives,
  useBankAccounts,
  useFinancialAssets,
  useFinancialLiabilities,
} from "@/lib/hooks/use-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TransactionDialog } from "./TransactionDialog";
import { TransactionCalendar } from "./TransactionCalendar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import type { TransactionRecord } from "@/lib/api/finance";

function getCategoryIcon(categoryName?: string) {
  if (!categoryName) return Tag;
  const c = categoryName.toLowerCase();
  if (
    c.includes("aliment") ||
    c.includes("supermercado") ||
    c.includes("groceries") ||
    c.includes("shopping")
  )
    return ShoppingBag;
  if (
    c.includes("restaurant") ||
    c.includes("dining") ||
    c.includes("cafe") ||
    c.includes("coffee")
  )
    return Coffee;
  if (
    c.includes("vivienda") ||
    c.includes("arriendo") ||
    c.includes("housing") ||
    c.includes("rent")
  )
    return Home;
  if (
    c.includes("transporte") ||
    c.includes("carro") ||
    c.includes("transport") ||
    c.includes("car")
  )
    return Car;
  if (c.includes("servicio") || c.includes("utilities") || c.includes("bills")) return Zap;
  return Tag;
}

interface MonthGroup {
  key: string;
  income: number;
  expenses: number;
  items: TransactionRecord[];
}

function monthLabel(key: string) {
  if (key === "s/fecha") return "Sin fecha";
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

export function TransactionsList() {
  const { data: transactions = [], isLoading, error } = useTransactions({ limit: 500 });
  const { data: categories = [] } = useCategories();
  const { data: objectives = [] } = useObjectives();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: assets = [] } = useFinancialAssets();
  const { data: liabilities = [] } = useFinancialLiabilities();
  const deleteTx = useDeleteTransaction();
  const fmtAmount = useFormattedAmount();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "investment">("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionRecord | null>(null);

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  const objectiveMap = useMemo(() => {
    const map: Record<number, string> = {};
    objectives.forEach((o) => {
      map[o.id] = o.name;
    });
    return map;
  }, [objectives]);

  const accountMap = useMemo(() => {
    const map: Record<number, string> = {};
    bankAccounts.forEach((a) => {
      map[a.id] = `${a.bank_name} · ${a.masked_account_number}`;
    });
    return map;
  }, [bankAccounts]);

  const assetMap = useMemo(() => {
    const map: Record<number, string> = {};
    assets.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [assets]);

  const liabilityMap = useMemo(() => {
    const map: Record<number, string> = {};
    liabilities.forEach((l) => {
      map[l.id] = l.name;
    });
    return map;
  }, [liabilities]);

  function linkedLabel(t: TransactionRecord): string | null {
    if (t.objective_id && objectiveMap[t.objective_id])
      return `Meta · ${objectiveMap[t.objective_id]}`;
    if (t.account_id && accountMap[t.account_id]) return `Cuenta · ${accountMap[t.account_id]}`;
    if (t.asset_id && assetMap[t.asset_id]) return `Activo · ${assetMap[t.asset_id]}`;
    if (t.liability_id && liabilityMap[t.liability_id])
      return `Pasivo · ${liabilityMap[t.liability_id]}`;
    return null;
  }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const catName = (categoryMap[t.category_id] ?? "").toLowerCase();
        const desc = (t.description ?? "").toLowerCase();
        if (!desc.includes(q) && !catName.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, search, categoryMap]);

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, MonthGroup>();
    for (const t of filtered) {
      const key = t.transaction_date?.slice(0, 7) ?? "s/fecha";
      const entry = map.get(key) ?? { key, income: 0, expenses: 0, items: [] };
      if (t.type === "income") entry.income += t.amount;
      else if (t.type === "expense") entry.expenses += t.amount;
      entry.items.push(t);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [filtered]);

  function openNew(date?: Date) {
    setEditingTx(null);
    setDefaultDate(date ?? null);
    setDialogOpen(true);
  }

  function handleEdit(tx: TransactionRecord) {
    setEditingTx(tx);
    setDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (!deletingTx) return;
    deleteTx.mutate(String(deletingTx.id), {
      onSuccess: () => {
        toast.success("Transacción eliminada");
        setDeletingTx(null);
      },
      onError: () => toast.error("Error al eliminar la transacción"),
    });
  }

  function handleDialogClose(v: boolean) {
    setDialogOpen(v);
    if (!v) {
      setEditingTx(null);
      setDefaultDate(null);
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Todos los movimientos</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Transacciones</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar transacciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary lg:w-80"
            />
          </div>
          <div className="flex rounded-xl bg-surface p-1">
            {(["all", "expense", "income", "investment"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  typeFilter === f
                    ? f === "expense"
                      ? "bg-destructive/15 text-destructive"
                      : f === "income"
                        ? "bg-success/15 text-success"
                        : f === "investment"
                          ? "bg-primary/15 text-primary"
                          : "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all"
                  ? "Todos"
                  : f === "expense"
                    ? "Gastos"
                    : f === "income"
                      ? "Ingresos"
                      : "Inversiones"}
              </button>
            ))}
          </div>
          <button
            onClick={() => openNew()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex h-32 items-center justify-center text-destructive text-sm">
              Error al cargar transacciones.
            </div>
          ) : groupedByMonth.length === 0 ? (
            <Card className="flex h-40 flex-col items-center justify-center text-muted-foreground text-sm">
              <Tag className="mb-2 h-6 w-6 opacity-50" />
              {transactions.length === 0
                ? "No se encontraron transacciones."
                : "No hay transacciones que coincidan con la búsqueda."}
            </Card>
          ) : (
            <div className="space-y-6">
              {groupedByMonth.map((month) => (
                <section key={month.key}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                    <h3 className="font-display text-lg font-semibold capitalize">
                      {monthLabel(month.key)}
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-success tabular-nums">+{fmtAmount(month.income)}</span>
                      <span className="text-destructive tabular-nums">
                        -{fmtAmount(month.expenses)}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        Balance {fmtAmount(month.income - month.expenses)}
                      </span>
                    </div>
                  </div>
                  <Card className="p-0">
                    <ul className="divide-y divide-border">
                      {month.items.map((t) => {
                        const categoryName = categoryMap[t.category_id] ?? "General";
                        const Icon = getCategoryIcon(categoryName);
                        return (
                          <li
                            key={t.id}
                            className="group flex items-center gap-4 px-5 py-4 transition hover:bg-surface/60"
                          >
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl",
                                t.type === "income"
                                  ? "bg-success/10 text-success"
                                  : t.type === "investment"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-surface-2 text-muted-foreground",
                              )}
                            >
                              <Icon className="h-4.5 w-4.5" size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {t.description ?? "Sin descripcion"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {categoryName} ·{" "}
                                {t.transaction_date
                                  ? new Date(
                                      t.transaction_date.slice(0, 10) + "T00:00:00",
                                    ).toLocaleDateString("es-CO", {
                                      day: "numeric",
                                      month: "short",
                                    })
                                  : "Sin fecha"}
                              </p>
                            </div>
                            <Badge tone="muted">{categoryName}</Badge>
                            {linkedLabel(t) && <Badge tone="primary">{linkedLabel(t)}</Badge>}
                            {t.is_fixed && (
                              <Badge tone="primary">
                                Fija
                                {t.frequency === "monthly"
                                  ? " · Mensual"
                                  : t.frequency === "biweekly"
                                    ? " · Quincenal"
                                    : ""}
                                {t.due_day ? ` · Día ${t.due_day}` : ""}
                              </Badge>
                            )}
                            <span
                              className={cn(
                                "w-28 text-right font-display text-base font-semibold tabular-nums",
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
                            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                              <button
                                onClick={() => handleEdit(t)}
                                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingTx(t)}
                                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </section>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center text-destructive text-sm">
              Error al cargar transacciones.
            </div>
          ) : (
            <TransactionCalendar
              transactions={filtered}
              categoryMap={categoryMap}
              getLinkedLabel={linkedLabel}
              onNewTransaction={(d) => openNew(d)}
              onEdit={handleEdit}
              onDelete={setDeletingTx}
            />
          )}
        </TabsContent>
      </Tabs>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        transaction={editingTx}
        defaultDate={defaultDate}
      />

      <ConfirmDialog
        open={!!deletingTx}
        onOpenChange={(v) => {
          if (!v) setDeletingTx(null);
        }}
        title="Eliminar transacción"
        description={`¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        loading={deleteTx.isPending}
      />
    </div>
  );
}
