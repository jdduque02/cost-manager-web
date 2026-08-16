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
  FileUp,
  ArrowLeftRight,
  Copy,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTransactions,
  useCategories,
  useDeleteTransaction,
  useDeleteTransfer,
  useBulkDeleteTransactions,
  useObjectives,
  useBankAccounts,
  useFinancialAssets,
  useFinancialLiabilities,
  useEmpresas,
  useCloneTransaction,
} from "@/lib/hooks/use-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TransactionDialog } from "./TransactionDialog";
import { TransferDialog } from "./TransferDialog";
import { TransactionCalendar } from "./TransactionCalendar";
import { CurrencyConverter } from "./CurrencyConverter";
import { GmfCalculator } from "./GmfCalculator";
import { StatementImportDialog } from "./StatementImportDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { TransactionRecord, TransferMovement, TransferResponse } from "@/lib/api/finance";

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

function toMovement(record: TransactionRecord, side: "source" | "destination"): TransferMovement {
  return {
    id: record.id,
    account_id:
      side === "source" ? (record.origin_account_id ?? 0) : (record.destination_account_id ?? 0),
    side,
    bank_name: side === "source" ? (record.source_bank ?? null) : (record.destination_bank ?? null),
    account_type:
      side === "source" ? (record.source_account ?? null) : (record.destination_account ?? null),
    amount: record.amount,
    transaction_date: record.transaction_date,
    description: record.description ?? null,
    reference_code: record.reference_code ?? null,
    objective_id: record.objective_id ?? null,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function recordsToTransfer(pair: TransactionRecord[]): TransferResponse {
  const source = pair.find((r) => r.origin_account_id != null) ?? pair[0];
  const destination = pair.find((r) => r.destination_account_id != null) ?? pair[0];
  return {
    transfer_group_id: source.transfer_group_id ?? "",
    amount: source.amount,
    transaction_date: source.transaction_date,
    description: source.description ?? null,
    reference_code: source.reference_code ?? null,
    objective_id: destination.objective_id ?? null,
    source: toMovement(source, "source"),
    destination: toMovement(destination, "destination"),
  };
}

export function TransactionsList() {
  const { data: transactions = [], isLoading, error } = useTransactions({ limit: 500 });
  const { data: categories = [] } = useCategories();
  const { data: objectives = [] } = useObjectives();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: assets = [] } = useFinancialAssets();
  const { data: liabilities = [] } = useFinancialLiabilities();
  const { data: empresas = [] } = useEmpresas();
  const deleteTx = useDeleteTransaction();
  const deleteTransfer = useDeleteTransfer();
  const bulkDelete = useBulkDeleteTransactions();
  const cloneTx = useCloneTransaction();
  const fmtAmount = useFormattedAmount();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "investment">("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferEditOpen, setTransferEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<TransferResponse | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkMonthLabel, setBulkMonthLabel] = useState<string | null>(null);

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

  const matchesFilters = (t: TransactionRecord): boolean => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (uncategorizedOnly && t.category_status !== "pending") return false;
    if (companyFilter !== "all") {
      if (companyFilter === "none" && t.company_id != null) return false;
      if (companyFilter !== "none" && String(t.company_id) !== companyFilter) return false;
    }
    return true;
  };

  const matchesSearch = (t: TransactionRecord): boolean => {
    if (!search) return true;
    const q = search.toLowerCase();
    const haystacks = [
      t.description ?? "",
      t.reference_code ?? "",
      t.source_bank ?? "",
      t.destination_bank ?? "",
      t.source_account ?? "",
      t.destination_account ?? "",
      t.addressee ?? "",
      categoryMap[t.category_id ?? -1] ?? "",
      accountMap[t.account_id ?? -1] ?? "",
      String(t.amount ?? ""),
    ];
    return haystacks.some((h) => h.toLowerCase().includes(q));
  };

  const { displayItems, groupMemberIds, transferPairs } = useMemo(() => {
    const groups = new Map<string, TransactionRecord[]>();
    const singles: TransactionRecord[] = [];
    for (const t of transactions) {
      if (t.transfer_group_id) {
        const list = groups.get(t.transfer_group_id) ?? [];
        list.push(t);
        groups.set(t.transfer_group_id, list);
      } else {
        singles.push(t);
      }
    }
    const memberIds = new Map<number, number[]>();
    const items: TransactionRecord[] = [];
    for (const pair of groups.values()) {
      if (!pair.some((r) => matchesFilters(r) && matchesSearch(r))) continue;
      const representative = pair.find((r) => r.destination_account_id != null) ?? pair[0];
      const ids = pair.map((r) => r.id);
      for (const r of pair) memberIds.set(r.id, ids);
      items.push(representative);
    }
    for (const t of singles) {
      if (matchesFilters(t) && matchesSearch(t)) items.push(t);
    }
    return {
      displayItems: items,
      groupMemberIds: memberIds,
      transferPairs: groups,
    };
  }, [transactions, typeFilter, uncategorizedOnly, companyFilter, search, categoryMap, accountMap]);

  const pendingCount = useMemo(
    () => transactions.filter((t) => t.category_status === "pending").length,
    [transactions],
  );

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, MonthGroup>();
    for (const t of displayItems) {
      const key = t.transaction_date?.slice(0, 7) ?? "s/fecha";
      const entry = map.get(key) ?? { key, income: 0, expenses: 0, items: [] };
      if (t.type === "income") entry.income += t.amount;
      else if (t.type === "expense") entry.expenses += t.amount;
      entry.items.push(t);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [displayItems]);

  function openNew(date?: Date) {
    setEditingTx(null);
    setDefaultDate(date ?? null);
    setDialogOpen(true);
  }

  function handleEdit(tx: TransactionRecord) {
    if (tx.transfer_group_id && transferPairs.get(tx.transfer_group_id)) {
      setEditingTransfer(recordsToTransfer(transferPairs.get(tx.transfer_group_id)!));
      setTransferEditOpen(true);
      return;
    }
    setEditingTx(tx);
    setDialogOpen(true);
  }

  function handleTransferEditClose(v: boolean) {
    setTransferEditOpen(v);
    if (!v) setEditingTransfer(null);
  }

  function handleDeleteConfirm() {
    if (!deletingTx) return;
    if (deletingTx.transfer_group_id) {
      deleteTransfer.mutate(String(deletingTx.id), {
        onSuccess: () => {
          toast.success("Transferencia eliminada");
          setDeletingTx(null);
        },
        onError: () => toast.error("Error al eliminar la transferencia"),
      });
      return;
    }
    deleteTx.mutate(String(deletingTx.id), {
      onSuccess: () => {
        toast.success("Transacción eliminada");
        setDeletingTx(null);
      },
      onError: () => toast.error("Error al eliminar la transacción"),
    });
  }

  function selectedMemberIds(t: TransactionRecord): number[] {
    return groupMemberIds.get(t.id) ?? [t.id];
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const memberId of groupMemberIds.get(id) ?? [id]) {
        if (next.has(memberId)) next.delete(memberId);
        else next.add(memberId);
      }
      return next;
    });
  }

  function allVisibleSelected() {
    const ids = displayItems.flatMap((t) => selectedMemberIds(t));
    return ids.length > 0 && ids.every((id) => selectedIds.has(id));
  }

  function toggleAllFiltered() {
    const ids = displayItems.flatMap((t) => selectedMemberIds(t));
    setSelectedIds((prev) => {
      if (ids.length > 0 && ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }

  function handleBulkDeleteConfirm() {
    if (selectedIds.size === 0) return;
    bulkDelete.mutate([...selectedIds], {
      onSuccess: () => {
        toast.success(`${selectedIds.size} transacciones eliminadas`);
        setSelectedIds(new Set());
        setBulkMonthLabel(null);
        setBulkConfirmOpen(false);
      },
      onError: () => toast.error("Error al eliminar las transacciones"),
    });
  }

  function handleDeleteMonth(month: MonthGroup) {
    setSelectedIds(new Set(month.items.flatMap((t) => selectedMemberIds(t))));
    setBulkMonthLabel(monthLabel(month.key));
    setBulkConfirmOpen(true);
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
            onClick={() => setUncategorizedOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
              uncategorizedOnly
                ? "border-warning bg-warning/15 text-warning"
                : "border-border bg-surface text-foreground hover:border-warning/50",
            )}
          >
            <Tag className="h-4 w-4" />
            Por editar
            {pendingCount > 0 && (
              <span className="rounded-full bg-warning/20 px-1.5 text-xs font-bold tabular-nums">
                {pendingCount}
              </span>
            )}
          </button>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-surface py-2.5 pl-10 pr-8 text-sm outline-none focus:border-primary lg:w-48"
            >
              <option value="all">Todas las empresas</option>
              {empresas.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.name}
                </option>
              ))}
              <option value="none">Sin empresa</option>
            </select>
          </div>
          <button
            onClick={() => openNew()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/50"
          >
            <FileUp className="h-4 w-4" />
            Importar extracto
          </button>
        </div>
      </div>

      {pendingCount > 0 && !uncategorizedOnly && (
        <button
          onClick={() => setUncategorizedOnly(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-left transition hover:bg-warning/15"
        >
          <Tag className="h-4 w-4 shrink-0 text-warning" />
          <span className="text-sm">
            <span className="font-semibold text-warning">{pendingCount}</span> transacción
            {pendingCount === 1 ? "" : "es"} sin clasificar importada
            {pendingCount === 1 ? "" : "s"}. Revisa su categoría para tener reportes exactos.
          </span>
          <span className="ml-auto text-xs font-semibold text-warning">Ver ahora</span>
        </button>
      )}

      {selectedIds.size > 0 && (
        <div className="sticky top-20 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 backdrop-blur">
          <span className="text-sm font-semibold text-foreground">
            {selectedIds.size} seleccionad{selectedIds.size === 1 ? "o" : "os"}
          </span>
          <button
            onClick={toggleAllFiltered}
            className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            {allVisibleSelected() ? "Quitar todos" : "Seleccionar todos los visibles"}
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/50"
            >
              Cancelar
            </button>
            <button
              onClick={() => setBulkConfirmOpen(true)}
              disabled={bulkDelete.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground transition hover:opacity-90"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {bulkDelete.isPending ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CurrencyConverter />
        <GmfCalculator />
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
                      <span className="mx-1 h-4 w-px bg-border" />
                      <button
                        onClick={() => handleDeleteMonth(month)}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        title={`Eliminar las ${month.items.length} transacciones de ${monthLabel(month.key)}`}
                        aria-label={`Eliminar las ${month.items.length} transacciones de ${monthLabel(month.key)}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <Card className="p-0">
                    <ul className="divide-y divide-border">
                      {month.items.map((t) => {
                        const isTransfer = !!t.transfer_group_id;
                        const categoryName = isTransfer
                          ? "Transferencia"
                          : (categoryMap[t.category_id ?? -1] ?? "Por editar");
                        const isPendingTx = !isTransfer && t.category_status === "pending";
                        const Icon = isTransfer ? ArrowLeftRight : getCategoryIcon(categoryName);
                        return (
                          <li
                            key={t.id}
                            className={cn(
                              "group flex items-center gap-4 px-5 py-4 transition hover:bg-surface/60",
                              isPendingTx && "bg-warning/[0.03]",
                            )}
                          >
                            <Checkbox
                              checked={selectedMemberIds(t).every((id) => selectedIds.has(id))}
                              onCheckedChange={() => toggleSelected(t.id)}
                              aria-label="Seleccionar transacción"
                              className="shrink-0"
                            />
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl",
                                isPendingTx
                                  ? "bg-warning/15 text-warning"
                                  : isTransfer
                                    ? "bg-primary/10 text-primary"
                                    : t.type === "income"
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
                                {categoryName}
                                {t.installments && t.installments > 1
                                  ? ` · ${t.installments} cuotas`
                                  : ""}
                                {" · "}
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
                            {isPendingTx ? (
                              <Badge tone="warning">Por editar</Badge>
                            ) : (
                              <Badge tone="muted">{categoryName}</Badge>
                            )}
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
                              {!isTransfer && (
                                <button
                                  onClick={() => {
                                    cloneTx.mutate(
                                      { id: t.id },
                                      {
                                        onSuccess: () => toast.success("Transacción clonada"),
                                        onError: () =>
                                          toast.error("Error al clonar la transacción"),
                                      },
                                    );
                                  }}
                                  disabled={cloneTx.isPending}
                                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                                  title="Clonar transacción"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              )}
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
              transactions={displayItems}
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

      <TransferDialog
        open={transferEditOpen}
        onOpenChange={handleTransferEditClose}
        transfer={editingTransfer}
      />

      <StatementImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmDialog
        open={!!deletingTx}
        onOpenChange={(v) => {
          if (!v) setDeletingTx(null);
        }}
        title={deletingTx?.transfer_group_id ? "Eliminar transferencia" : "Eliminar transacción"}
        description={
          deletingTx?.transfer_group_id
            ? "¿Estás seguro de eliminar esta transferencia? Se eliminarán ambos movimientos (origen y destino) y se recalcularán los saldos. Esta acción no se puede deshacer."
            : "¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer."
        }
        onConfirm={handleDeleteConfirm}
        loading={deleteTx.isPending || deleteTransfer.isPending}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={(v) => {
          if (!v) {
            setBulkConfirmOpen(false);
            if (bulkMonthLabel) setSelectedIds(new Set());
            setBulkMonthLabel(null);
          }
        }}
        title={
          bulkMonthLabel ? `Eliminar transacciones de ${bulkMonthLabel}` : "Eliminar transacciones"
        }
        description={
          bulkMonthLabel
            ? `¿Estás seguro de eliminar las ${selectedIds.size} transacciones de ${bulkMonthLabel}? Se recalculan los saldos de las cuentas, activos y pasivos asociados. Esta acción no se puede deshacer.`
            : `¿Estás seguro de eliminar ${selectedIds.size} transacciones? Se recalculan los saldos de las cuentas, activos y pasivos asociados. Esta acción no se puede deshacer.`
        }
        onConfirm={handleBulkDeleteConfirm}
        loading={bulkDelete.isPending}
      />
    </div>
  );
}
