import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Landmark, CreditCard, Wallet, TrendingUp, Banknote, Loader2 } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { fmtCurrency } from "@/lib/format";
import { useBankAccounts, useFinancialAssets, useFinancialLiabilities } from "@/lib/hooks/use-api";
import { useMemo } from "react";

const COLORS = ["oklch(0.78 0.17 165)", "oklch(0.7 0.18 250)", "oklch(0.78 0.17 60)", "oklch(0.68 0.20 18)"];

function Row({ name, value, type, debt }: { name: string; value: number; type: string; debt?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface/40 p-4">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{type}</p>
      </div>
      <span className={`font-display text-base font-semibold tabular-nums ${debt ? "text-destructive" : "text-success"}`}>
        {debt ? "−" : ""}{fmtCurrency(value)}
      </span>
    </div>
  );
}

export function Wealth() {
  const { data: accounts = [], isLoading: loadAcc } = useBankAccounts();
  const { data: assets = [], isLoading: loadAst } = useFinancialAssets();
  const { data: liabilities = [], isLoading: loadLia } = useFinancialLiabilities();

  const totalAssets = useMemo(() => {
    const accTotal = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
    const astTotal = assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0);
    return accTotal + astTotal;
  }, [accounts, assets]);

  const totalLiab = liabilities.reduce((sum, l) => sum + (l.currentBalance ?? 0), 0);
  const net = totalAssets - totalLiab;

  const isLoading = loadAcc || loadAst || loadLia;

  const activeAccountsCount = accounts.filter(a => a.status === "ACTIVE").length;
  const cashOnHand = accounts.filter(a => a.type === "CASH" || a.type === "CHECKING").reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const investments = assets.filter(a => a.type === "INVESTMENT" || a.type === "STOCK" || a.type === "CRYPTO").reduce((sum, a) => sum + (a.currentValue ?? 0), 0);

  const wealthComposition = useMemo(() => {
    const comp: { name: string; value: number }[] = [];
    
    // Group bank accounts by type
    const accGroup: Record<string, number> = {};
    accounts.forEach(a => {
      const t = a.type || "OTHER_ACCOUNT";
      accGroup[t] = (accGroup[t] || 0) + (a.balance ?? 0);
    });
    Object.entries(accGroup).forEach(([type, value]) => {
      if(value > 0) comp.push({ name: type.replace(/_/g, " "), value });
    });

    // Group assets by type
    const astGroup: Record<string, number> = {};
    assets.forEach(a => {
      const t = a.type || "OTHER_ASSET";
      astGroup[t] = (astGroup[t] || 0) + (a.currentValue ?? 0);
    });
    Object.entries(astGroup).forEach(([type, value]) => {
      if(value > 0) comp.push({ name: type.replace(/_/g, " "), value });
    });

    return comp.sort((a, b) => b.value - a.value);
  }, [accounts, assets]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Patrimonio y Bancos</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Tu patrimonio neto completo</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Activos</p>
          <p className="mt-2 font-display text-2xl font-semibold text-success">{fmtCurrency(totalAssets)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Pasivos</p>
          <p className="mt-2 font-display text-2xl font-semibold text-destructive">−{fmtCurrency(totalLiab)}</p>
        </Card>
        <Card glow>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Patrimonio Neto</p>
          <p className="mt-2 font-display text-2xl font-semibold">{fmtCurrency(net)}</p>
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
              </div>
              <div className="space-y-2.5">
                {assets.length === 0 && accounts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No se encontraron activos.</p>
                )}
                {accounts.map((a) => (
                  <Row key={a.id} name={a.name} value={a.balance ?? 0} type={a.type} />
                ))}
                {assets.map((a) => (
                  <Row key={a.id} name={a.name} value={a.currentValue ?? 0} type={a.type} />
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
                  <Row key={l.id} name={l.name} value={l.currentBalance ?? 0} type={l.type} debt />
                ))}
              </div>
            </section>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-semibold">Composición del patrimonio</h3>
          <p className="text-sm text-muted-foreground">Donde está tu dinero</p>
          
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
                      formatter={(v: number) => fmtCurrency(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2">
                {wealthComposition.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground capitalize">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                      {c.name.toLowerCase()}
                    </span>
                    <span className="font-medium tabular-nums">{fmtCurrency(c.value)}</span>
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
          <p className="font-display text-xl font-semibold">{fmtCurrency(accounts.reduce((s, a) => s + (a.balance ?? 0), 0))}</p>
          <Badge tone="success">{activeAccountsCount} activa(s)</Badge>
        </Card>
        <Card>
          <TrendingUp className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Inversiones</p>
          <p className="font-display text-xl font-semibold">{fmtCurrency(investments)}</p>
          <Badge tone="success">Año actual</Badge>
        </Card>
        <Card>
          <Banknote className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Efectivo</p>
          <p className="font-display text-xl font-semibold">{fmtCurrency(cashOnHand)}</p>
          <Badge tone="muted">Estable</Badge>
        </Card>
      </div>
    </div>
  );
}
