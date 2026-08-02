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
} from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { useFormattedAmount } from "@/lib/hooks/use-formatted-amount";
import {
  useBankAccounts,
  useFinancialAssets,
  useFinancialLiabilities,
  useDeleteBankAccount,
  useDeleteFinancialAsset,
  useDeleteFinancialLiability,
  useRefreshAssetQuotes,
} from "@/lib/hooks/use-api";
import { WealthDialog } from "./WealthDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import type { BankAccount, FinancialAsset, FinancialLiability } from "@/lib/api/banking";

const COLORS = [
  "oklch(0.78 0.17 165)",
  "oklch(0.7 0.18 250)",
  "oklch(0.78 0.17 60)",
  "oklch(0.68 0.20 18)",
];

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
  debt,
  onEdit,
  onDelete,
  fmtAmount,
}: {
  name: string;
  value: number;
  type: string;
  currency?: string;
  symbol?: string | null;
  yieldPct?: number | null;
  debt?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  fmtAmount: (v: number) => string;
}) {
  return (
    <div className="group flex items-center justify-between rounded-xl border border-border bg-surface/40 p-4">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {type}
          {currency && currency !== "COP" ? (
            <span className="ml-1.5 font-mono text-[10px] uppercase text-muted-foreground/60">
              ({currency})
            </span>
          ) : null}
          {symbol ? (
            <span className="ml-1.5 font-mono text-[10px] uppercase text-primary/70">{symbol}</span>
          ) : null}
          {yieldPct != null ? (
            <span className="ml-1.5 font-mono text-[10px] text-success/80">{yieldPct}%</span>
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
  );
}

export function Wealth() {
  const { data: accounts = [], isLoading: loadAcc } = useBankAccounts();
  const { data: assets = [], isLoading: loadAst } = useFinancialAssets();
  const { data: liabilities = [], isLoading: loadLia } = useFinancialLiabilities();
  const deleteAccount = useDeleteBankAccount();
  const deleteAsset = useDeleteFinancialAsset();
  const deleteLiability = useDeleteFinancialLiability();
  const refreshQuotes = useRefreshAssetQuotes();
  const fmtAmount = useFormattedAmount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>("account");
  const [editingEntity, setEditingEntity] = useState<
    BankAccount | FinancialAsset | FinancialLiability | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const totalAssets = useMemo(() => {
    const accTotal = accounts.reduce((sum, a) => sum + Number(a.display_balance ?? 0), 0);
    const astTotal = assets.reduce((sum, a) => sum + Number(a.current_value ?? 0), 0);
    return accTotal + astTotal;
  }, [accounts, assets]);

  const totalLiab = liabilities.reduce((sum, l) => sum + Number(l.current_balance ?? 0), 0);
  const net = totalAssets - totalLiab;

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
  const investmentAccountTypes = ["inversion", "fna", "aporte_pension_voluntaria"];
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      </div>

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
              <div className="space-y-2.5">
                {assets.length === 0 && accounts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No se encontraron activos.</p>
                )}
                {accounts.map((a) => (
                  <Row
                    key={`acc-${a.id}`}
                    name={`${a.bank_name} - ${humanizeType(a.account_type)}`}
                    value={Number(a.display_balance ?? 0)}
                    type={humanizeType(a.account_type)}
                    currency={a.currency}
                    onEdit={() => openEdit("account", a)}
                    onDelete={() =>
                      setDeleteTarget({ type: "account", id: String(a.id), name: a.bank_name })
                    }
                    fmtAmount={fmtAmount}
                  />
                ))}
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
                    fmtAmount={fmtAmount}
                  />
                ))}
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
                    fmtAmount={fmtAmount}
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
                        background: "oklch(0.21 0.014 260)",
                        border: "1px solid oklch(0.30 0.014 260)",
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
    </div>
  );
}
