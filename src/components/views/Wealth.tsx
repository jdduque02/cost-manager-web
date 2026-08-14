import { useState, useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Landmark,
  CreditCard,
  Wallet,
  TrendingUp,
  Banknote,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Star,
  ShieldCheck,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import { useChartColors } from "@/lib/hooks/use-chart-colors";
import {
  useBankAccounts,
  useFinancialAssets,
  useFinancialLiabilities,
  useDeleteBankAccount,
  useDeleteFinancialAsset,
  useDeleteFinancialLiability,
  useUpdateBankAccount,
  useRefreshAssetQuotes,
  useTransactions,
  useCategories,
} from "@/lib/hooks/use-api";
import { WealthDialog } from "./WealthDialog";
import { TransactionsDetailModal } from "./TransactionsDetailModal";
import { CurrencyConverter } from "./CurrencyConverter";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { BankAccount, FinancialAsset, FinancialLiability } from "@/lib/api/banking";
import { accountTypeLabel } from "@/lib/api/banking";
import type { TransactionRecord } from "@/lib/api/finance";

type EntityType = "account" | "asset" | "liability";

function humanizeType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface DeleteTarget {
  type: EntityType;
  id: string;
  name: string;
}

function Row({
  name,
  value,
  type,
  currency,
  symbol,
  yieldPct,
  yieldFrequency,
  debt,
  onEdit,
  onDelete,
  onShowDetails,
  fmtAmount,
  transactionCount,
  isPrimary,
  exempt4x1000,
  onTogglePrimary,
  onToggleExempt,
}: {
  name: string;
  value: number;
  type: string;
  currency?: string;
  symbol?: string | null;
  yieldPct?: number | null;
  yieldFrequency?: string;
  debt?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onShowDetails: () => void;
  fmtAmount: (v: number) => string;
  transactionCount: number;
  isPrimary?: boolean;
  exempt4x1000?: boolean;
  onTogglePrimary?: () => void;
  onToggleExempt?: () => void;
}) {
  const isAccount = onTogglePrimary !== undefined || onToggleExempt !== undefined;
  return (
    <div className="group rounded-xl border border-border bg-surface/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {type}
            {currency ? (
              <span className="ml-1.5 font-mono text-[10px] uppercase text-muted-foreground/60">
                ({currency})
              </span>
            ) : null}
            {symbol ? (
              <span className="ml-1.5 font-mono text-[10px] uppercase text-primary/70">
                {symbol}
              </span>
            ) : null}
            {yieldPct != null ? (
              <span className="ml-1.5 font-mono text-[10px] text-success/80">
                {yieldPct}%
                {yieldFrequency
                  ? ` ${yieldFrequency === "daily" ? "diario" : yieldFrequency === "monthly" ? "mensual" : "anual"}`
                  : ""}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`font-display text-base font-semibold tabular-nums ${debt ? "text-destructive" : "text-success"}`}
          >
            {debt ? "-" : ""}
            {fmtAmount(value)}
          </span>
          <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      {isAccount && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onTogglePrimary}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
              isPrimary
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <Star className="h-3.5 w-3.5" />
            {isPrimary ? "Principal" : "Marcar principal"}
          </button>
          <button
            onClick={onToggleExempt}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
              exempt4x1000
                ? "border-success/40 bg-success/10 text-success"
                : "border-border/60 text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {exempt4x1000 ? "Exenta 4x1000" : "Marcar exenta 4x1000"}
          </button>
        </div>
      )}
      <button
        onClick={onShowDetails}
        className="mt-3 w-full rounded-lg border border-border/60 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
      >
        Ver detalles ({transactionCount})
      </button>
    </div>
  );
}

export function Wealth() {
  const { data: accounts = [], isLoading: loadAcc } = useBankAccounts();
  const { data: assets = [], isLoading: loadAst } = useFinancialAssets();
  const { data: liabilities = [], isLoading: loadLia } = useFinancialLiabilities();
  const { data: transactions = [] } = useTransactions({ limit: 500 });
  const { data: categories = [] } = useCategories();
  const deleteAccount = useDeleteBankAccount();
  const deleteAsset = useDeleteFinancialAsset();
  const deleteLiability = useDeleteFinancialLiability();
  const updateAccount = useUpdateBankAccount();
  const refreshQuotes = useRefreshAssetQuotes();
  const fmtAmount = useFormattedAmount();
  const colors = useChartColors();
  const COLORS = [colors.chart1, colors.chart2, colors.chart3, colors.chart5];

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const linked = useMemo(() => {
    const byAccount = new Map<number, TransactionRecord[]>();
    const byAsset = new Map<number, TransactionRecord[]>();
    const byLiability = new Map<number, TransactionRecord[]>();
    for (const t of transactions) {
      const target = t.account_id
        ? { map: byAccount, id: t.account_id }
        : t.asset_id
          ? { map: byAsset, id: t.asset_id }
          : t.liability_id
            ? { map: byLiability, id: t.liability_id }
            : null;
      if (!target) continue;
      const list = target.map.get(target.id) ?? [];
      list.push(t);
      target.map.set(target.id, list);
    }
    [byAccount, byAsset, byLiability].forEach((m) =>
      m.forEach((list) =>
        list.sort((a, b) => (b.transaction_date ?? "").localeCompare(a.transaction_date ?? "")),
      ),
    );
    return { byAccount, byAsset, byLiability };
  }, [transactions]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>("account");
  const [editingEntity, setEditingEntity] = useState<
    BankAccount | FinancialAsset | FinancialLiability | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<{
    title: string;
    subtitle?: string;
    transactions: TransactionRecord[];
  } | null>(null);

  const totalAssets = useMemo(() => {
    const accTotal = accounts.reduce((sum, a) => sum + Number(a.display_balance ?? 0), 0);
    const astTotal = assets.reduce((sum, a) => sum + Number(a.current_value ?? 0), 0);
    return accTotal + astTotal;
  }, [accounts, assets]);

  const totalLiab = liabilities.reduce((sum, l) => sum + Number(l.current_balance ?? 0), 0);
  const net = totalAssets - totalLiab;

  const projection = useMemo(() => {
    const rateItems = [
      ...accounts.map((a) => ({
        v: Number(a.display_balance ?? 0),
        r: Number(a.annual_interest_rate ?? 0),
      })),
      ...assets.map((a) => ({
        v: Number(a.current_value ?? 0),
        r: Number(a.current_yield ?? 0),
      })),
    ].filter((x) => x.v > 0 && x.r > 0);
    const ratedValue = rateItems.reduce((s, x) => s + x.v, 0);
    const blendedRate =
      ratedValue > 0 ? rateItems.reduce((s, x) => s + (x.v * x.r) / ratedValue, 0) : 0;
    const projected = (years: number) =>
      blendedRate > 0
        ? Math.round(totalAssets * Math.pow(1 + blendedRate / 100, years) * 100) / 100
        : null;
    return { blendedRate, ratedValue, projected5y: projected(5), projected10y: projected(10) };
  }, [accounts, assets, totalAssets]);

  const isLoading = loadAcc || loadAst || loadLia;

  const activeAccountsCount = accounts.length;
  const cashOnHand = accounts
    .filter((a) => a.account_type === "ahorros" || a.account_type === "corriente")
    .reduce((sum, a) => sum + Number(a.display_balance ?? 0), 0);
  const investmentAssetTypes = [
    "acciones",
    "acciones_fraccion",
    "fondos_inversion",
    "cryptomonedas",
    "ahorro_alto_rendimiento",
  ];
  const investmentAccountTypes = [
    "inversion",
    "cdt",
    "ahorro_alto_rendimiento",
    "fna",
    "aporte_pension_voluntaria",
  ];
  const investments =
    assets
      .filter((a) => investmentAssetTypes.includes(a.asset_type))
      .reduce((sum, a) => sum + Number(a.current_value ?? 0), 0) +
    accounts
      .filter((a) => investmentAccountTypes.includes(a.account_type))
      .reduce((sum, a) => sum + Number(a.display_balance ?? 0), 0);

  const wealthComposition = useMemo(() => {
    const comp: { name: string; currency: string; value: number }[] = [];
    const groups: Record<string, { name: string; currency: string; value: number }> = {};
    const add = (type: string, currency: string, value: number) => {
      if (value <= 0) return;
      const key = `${type}|${currency || "COP"}`;
      const existing = groups[key];
      if (existing) existing.value += value;
      else {
        const entry = { name: type.replace(/_/g, " "), currency: currency || "COP", value };
        groups[key] = entry;
        comp.push(entry);
      }
    };
    accounts.forEach((a) =>
      add(a.account_type || "otro", a.currency || "COP", Number(a.display_balance ?? 0)),
    );
    assets.forEach((a) =>
      add(a.asset_type || "otro", a.currency || "COP", Number(a.current_value ?? 0)),
    );
    return comp.sort((a, b) => b.value - a.value);
  }, [accounts, assets]);

  function openCreate(type: EntityType) {
    setEntityType(type);
    setEditingEntity(null);
    setDialogOpen(true);
  }

  function openEdit(type: EntityType, entity: BankAccount | FinancialAsset | FinancialLiability) {
    setEntityType(type);
    setEditingEntity(entity);
    setDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    const onSuccess = () => {
      toast.success("Elemento eliminado");
      setDeleteTarget(null);
    };
    const onError = () => toast.error("Error al eliminar");

    if (type === "account") deleteAccount.mutate(id, { onSuccess, onError });
    else if (type === "asset") deleteAsset.mutate(id, { onSuccess, onError });
    else deleteLiability.mutate(id, { onSuccess, onError });
  }

  function handleRefreshQuotes() {
    refreshQuotes.mutate(undefined, {
      onSuccess: (quotes) => {
        const ok = quotes.filter((q) => q.success).length;
        toast.success(`Valores actualizados (${ok}/${quotes.length})`);
      },
      onError: () => toast.error("Error al consultar los valores en línea"),
    });
  }

  function handleTogglePrimary(account: BankAccount) {
    const next = !account.is_primary;
    const updates = accounts.map((a) =>
      a.id === account.id ? { id: String(a.id), dto: { is_primary: next } } : null,
    );
    if (next) {
      accounts.forEach((a) => {
        if (a.id !== account.id && a.is_primary) {
          updates.push({ id: String(a.id), dto: { is_primary: false } });
        }
      });
    }
    Promise.all(updates.filter(Boolean).map((u) => updateAccount.mutateAsync(u!)))
      .then(() => toast.success(next ? "Cuenta principal actualizada" : "Ya no es principal"))
      .catch(() => toast.error("Error al actualizar la cuenta principal"));
  }

  function handleToggleExempt(account: BankAccount) {
    const next = !account.exempt_4x1000;
    const updates = accounts.map((a) =>
      a.id === account.id
        ? { id: String(a.id), dto: { exempt_4x1000: next } }
        : next && a.exempt_4x1000
          ? { id: String(a.id), dto: { exempt_4x1000: false } }
          : null,
    );
    Promise.all(updates.filter(Boolean).map((u) => updateAccount.mutateAsync(u!)))
      .then(() => toast.success(next ? "Cuenta exenta del 4x1000" : "Cuenta ya no exenta"))
      .catch(() => toast.error("Error al actualizar la exención 4x1000"));
  }

  const hasSymbolizedAssets = assets.some((a) => !!a.symbol);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Patrimonio y Bancos</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Tu patrimonio neto completo</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openCreate("account")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Cuenta
          </button>
          <button
            onClick={() => openCreate("asset")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-2"
          >
            <Plus className="h-4 w-4" /> Activo
          </button>
          <button
            onClick={() => openCreate("liability")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-2"
          >
            <Plus className="h-4 w-4" /> Deuda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Activos</p>
          <p className="mt-2 font-display text-2xl font-semibold text-success">
            {fmtAmount(totalAssets)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Pasivos</p>
          <p className="mt-2 font-display text-2xl font-semibold text-destructive">
            -{fmtAmount(totalLiab)}
          </p>
        </Card>
        <Card glow>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Patrimonio Neto</p>
          <p className="mt-2 font-display text-2xl font-semibold">{fmtAmount(net)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Proyeccion 10 anos
          </p>
          {projection.projected10y != null ? (
            <>
              <p className="mt-2 font-display text-2xl font-semibold text-primary">
                {fmtAmount(projection.projected10y)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {projection.blendedRate.toFixed(2)}% anual ponderado · interes compuesto
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Define tasas/rentabilidad en cuentas y activos para proyectar.
            </p>
          )}
        </Card>
      </div>

      <CurrencyConverter />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10">
                  <Landmark className="h-4.5 w-4.5 text-success" size={18} />
                </div>
                <h3 className="font-display text-lg font-semibold">Activos</h3>
                <button
                  onClick={handleRefreshQuotes}
                  disabled={!hasSymbolizedAssets || refreshQuotes.isPending}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  title="Consultar el valor en línea de los activos con símbolo"
                >
                  {refreshQuotes.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" />
                  )}
                  Consultar valores en línea
                </button>
              </div>
              <div className="space-y-4">
                {assets.length === 0 && accounts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No se encontraron activos.</p>
                )}

                {/* ── Cuentas de ahorro ── */}
                {accounts.filter((a) => a.account_type === "ahorros").length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Cuentas de ahorro
                    </p>
                    <div className="space-y-2.5">
                      {accounts
                        .filter((a) => a.account_type === "ahorros")
                        .map((a) => (
                          <Row
                            key={`acc-${a.id}`}
                            name={`${a.bank_name} - ${accountTypeLabel(a.account_type)}`}
                            value={Number(a.display_balance ?? 0)}
                            type={accountTypeLabel(a.account_type)}
                            currency={a.currency}
                            yieldPct={a.annual_interest_rate}
                            yieldFrequency={a.yield_frequency}
                            onEdit={() => openEdit("account", a)}
                            onDelete={() =>
                              setDeleteTarget({
                                type: "account",
                                id: String(a.id),
                                name: a.bank_name,
                              })
                            }
                            onShowDetails={() =>
                              setDetailsTarget({
                                title: `${a.bank_name} - ${accountTypeLabel(a.account_type)}`,
                                subtitle: `Saldo actual: ${fmtAmount(Number(a.display_balance ?? 0))}`,
                                transactions: linked.byAccount.get(a.id) ?? [],
                              })
                            }
                            isPrimary={a.is_primary}
                            exempt4x1000={a.exempt_4x1000}
                            onTogglePrimary={() => handleTogglePrimary(a)}
                            onToggleExempt={() => handleToggleExempt(a)}
                            fmtAmount={fmtAmount}
                            transactionCount={linked.byAccount.get(a.id)?.length ?? 0}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* ── Cuentas corrientes ── */}
                {accounts.filter((a) => a.account_type === "corriente").length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Cuentas corrientes
                    </p>
                    <div className="space-y-2.5">
                      {accounts
                        .filter((a) => a.account_type === "corriente")
                        .map((a) => (
                          <Row
                            key={`acc-${a.id}`}
                            name={`${a.bank_name} - ${accountTypeLabel(a.account_type)}`}
                            value={Number(a.display_balance ?? 0)}
                            type={accountTypeLabel(a.account_type)}
                            currency={a.currency}
                            yieldPct={a.annual_interest_rate}
                            yieldFrequency={a.yield_frequency}
                            onEdit={() => openEdit("account", a)}
                            onDelete={() =>
                              setDeleteTarget({
                                type: "account",
                                id: String(a.id),
                                name: a.bank_name,
                              })
                            }
                            onShowDetails={() =>
                              setDetailsTarget({
                                title: `${a.bank_name} - ${accountTypeLabel(a.account_type)}`,
                                subtitle: `Saldo actual: ${fmtAmount(Number(a.display_balance ?? 0))}`,
                                transactions: linked.byAccount.get(a.id) ?? [],
                              })
                            }
                            isPrimary={a.is_primary}
                            exempt4x1000={a.exempt_4x1000}
                            onTogglePrimary={() => handleTogglePrimary(a)}
                            onToggleExempt={() => handleToggleExempt(a)}
                            fmtAmount={fmtAmount}
                            transactionCount={linked.byAccount.get(a.id)?.length ?? 0}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* ── Inversiones (cuentas) ── */}
                {accounts.filter(
                  (a) => a.account_type !== "ahorros" && a.account_type !== "corriente",
                ).length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Inversiones
                    </p>
                    <div className="space-y-2.5">
                      {accounts
                        .filter(
                          (a) => a.account_type !== "ahorros" && a.account_type !== "corriente",
                        )
                        .map((a) => (
                          <Row
                            key={`acc-${a.id}`}
                            name={`${a.bank_name} - ${accountTypeLabel(a.account_type)}`}
                            value={Number(a.display_balance ?? 0)}
                            type={accountTypeLabel(a.account_type)}
                            currency={a.currency}
                            yieldPct={a.annual_interest_rate}
                            yieldFrequency={a.yield_frequency}
                            onEdit={() => openEdit("account", a)}
                            onDelete={() =>
                              setDeleteTarget({
                                type: "account",
                                id: String(a.id),
                                name: a.bank_name,
                              })
                            }
                            onShowDetails={() =>
                              setDetailsTarget({
                                title: `${a.bank_name} - ${accountTypeLabel(a.account_type)}`,
                                subtitle: `Saldo actual: ${fmtAmount(Number(a.display_balance ?? 0))}`,
                                transactions: linked.byAccount.get(a.id) ?? [],
                              })
                            }
                            isPrimary={a.is_primary}
                            exempt4x1000={a.exempt_4x1000}
                            onTogglePrimary={() => handleTogglePrimary(a)}
                            onToggleExempt={() => handleToggleExempt(a)}
                            fmtAmount={fmtAmount}
                            transactionCount={linked.byAccount.get(a.id)?.length ?? 0}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* ── Acciones / Activos financieros ── */}
                {assets.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Acciones / Activos
                    </p>
                    <div className="space-y-2.5">
                      {assets.map((a) => (
                        <Row
                          key={`ast-${a.id}`}
                          name={a.name}
                          value={Number(a.current_value)}
                          type={humanizeType(a.asset_type)}
                          currency={a.currency}
                          symbol={a.symbol}
                          yieldPct={a.current_yield}
                          onEdit={() => openEdit("asset", a)}
                          onDelete={() =>
                            setDeleteTarget({ type: "asset", id: String(a.id), name: a.name })
                          }
                          onShowDetails={() =>
                            setDetailsTarget({
                              title: a.name,
                              subtitle: `Valor actual: ${fmtAmount(Number(a.current_value ?? 0))}`,
                              transactions: linked.byAsset.get(a.id) ?? [],
                            })
                          }
                          fmtAmount={fmtAmount}
                          transactionCount={linked.byAsset.get(a.id)?.length ?? 0}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
            <section>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
                  <CreditCard className="h-4.5 w-4.5 text-destructive" size={18} />
                </div>
                <h3 className="font-display text-lg font-semibold">Pasivos</h3>
              </div>
              <div className="space-y-2.5">
                {liabilities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No se encontraron pasivos.</p>
                )}
                {liabilities.map((l) => (
                  <Row
                    key={`lia-${l.id}`}
                    name={l.name}
                    value={Number(l.current_balance)}
                    type={humanizeType(l.liability_type)}
                    currency={l.currency}
                    debt
                    onEdit={() => openEdit("liability", l)}
                    onDelete={() =>
                      setDeleteTarget({ type: "liability", id: String(l.id), name: l.name })
                    }
                    onShowDetails={() =>
                      setDetailsTarget({
                        title: l.name,
                        subtitle: `Saldo actual: ${fmtAmount(Number(l.current_balance ?? 0))}`,
                        transactions: linked.byLiability.get(l.id) ?? [],
                      })
                    }
                    fmtAmount={fmtAmount}
                    transactionCount={linked.byLiability.get(l.id)?.length ?? 0}
                  />
                ))}
              </div>
            </section>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-semibold">Composicion del patrimonio</h3>
          <p className="text-sm text-muted-foreground">Donde esta tu dinero</p>
          {wealthComposition.length > 0 ? (
            <>
              <div className="mt-4 h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={wealthComposition}
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {wealthComposition.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: colors.card,
                        border: `1px solid ${colors.cardBorder}`,
                        borderRadius: 12,
                      }}
                      formatter={(v: number) => fmtAmount(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2">
                {wealthComposition.map((c, i) => (
                  <li
                    key={`${c.name}-${c.currency}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground capitalize">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      {c.name.toLowerCase()}
                    </span>
                    <span className="font-medium tabular-nums">
                      {fmtAmount(c.value)}
                      <span className="ml-1 font-mono text-[10px] uppercase text-muted-foreground/60">
                        ({c.currency})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No hay datos para mostrar.
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <Wallet className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Cuentas bancarias</p>
          <p className="font-display text-xl font-semibold">
            {fmtAmount(accounts.reduce((s, a) => s + Number(a.display_balance ?? 0), 0))}
          </p>
          <Badge tone="success">{activeAccountsCount} cuenta(s)</Badge>
        </Card>
        <Card>
          <TrendingUp className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Inversiones</p>
          <p className="font-display text-xl font-semibold">{fmtAmount(investments)}</p>
          <Badge tone="success">Ano actual</Badge>
        </Card>
        <Card>
          <Banknote className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Efectivo</p>
          <p className="font-display text-xl font-semibold">{fmtAmount(cashOnHand)}</p>
          <Badge tone="muted">Estable</Badge>
        </Card>
      </div>

      <WealthDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingEntity(null);
        }}
        entityType={entityType}
        entity={editingEntity}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        title={`Eliminar ${deleteTarget?.type === "account" ? "cuenta" : deleteTarget?.type === "asset" ? "activo" : "deuda"}`}
        description={`¿Estás seguro de eliminar "${deleteTarget?.name ?? ""}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        loading={deleteAccount.isPending || deleteAsset.isPending || deleteLiability.isPending}
      />

      <TransactionsDetailModal
        open={!!detailsTarget}
        onOpenChange={(v) => {
          if (!v) setDetailsTarget(null);
        }}
        title={detailsTarget?.title ?? ""}
        subtitle={detailsTarget?.subtitle}
        transactions={detailsTarget?.transactions ?? []}
        categoryMap={categoryMap}
      />
    </div>
  );
}
