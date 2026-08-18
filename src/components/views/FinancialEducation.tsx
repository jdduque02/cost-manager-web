import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  TrendingUp,
  Shield,
  AlertTriangle,
  Calculator,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/primitives";

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface/60"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

function StratTable({ rows }: { rows: { concept: string; pct: string; amount: string }[] }) {
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-2 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Concepto</th>
            <th className="px-3 py-2 text-right font-medium">%</th>
            <th className="px-3 py-2 text-right font-medium">Monto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.concept} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{r.concept}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.pct}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {r.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="shrink-0 text-primary">&#8226;</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const INCOME_EXAMPLE = 4_000_000;

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

export function FinancialEducation() {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">
            Guia Financiera para Independientes
          </h3>
          <p className="text-xs text-muted-foreground">
            Regla 50-20-30 y estrategias alternativas en Colombia
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <CollapsibleSection title="Por que la Regla 50-20-30" icon={Lightbulb} defaultOpen>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              La regla 50-20-30 es un excelente punto de partida porque garantiza sostenibilidad
              financiera y calidad de vida sin comprometer el futuro.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-surface p-3">
                <p className="font-semibold text-foreground">50% Gastos Fijos</p>
                <p className="mt-1 text-xs">
                  Obligaciones esenciales: vivienda, servicios, seguros. Previene endeudamiento con
                  ingresos variables.
                </p>
              </div>
              <div className="rounded-lg bg-surface p-3">
                <p className="font-semibold text-foreground">20% Recreacion</p>
                <p className="mt-1 text-xs">
                  Calidad de vida sin comprometer el futuro. Psicologicamente importante para
                  mantener consistencia.
                </p>
              </div>
              <div className="rounded-lg bg-surface p-3">
                <p className="font-semibold text-foreground">30% Ahorro</p>
                <p className="mt-1 text-xs">
                  Colchon de 3-6 meses de gastos. Fundamental cuando el ingreso fluctua.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Razones para Independientes en Colombia" icon={Shield}>
          <BulletList
            items={[
              "Ingresos irregulares: el 30% de ahorro actua como amortiguador en meses bajos.",
              "Sin seguridad social automatica: debes ahorrar para aportes a salud/pension (~29%).",
              "Inflacion colombiana: un 30% garantiza poder de adquisicion futuro.",
              "Emergencias medicas: sin empresa que cubra, necesitas fondo de emergencia robusto.",
              "Carga tributaria variable: algunos anos pagas mas impuestos; el ahorro lo mitiga.",
            ]}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Estrategia 1: 60-30-10 (Recien Iniciados)" icon={TrendingUp}>
          <div className="text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Cuando usarla:</strong> Primeros 2-3 anos cuando
              estas creciendo tu base de clientes. Sacrificas ahorro por escalar ingresos.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Gastos esenciales + tributaria",
                  pct: "60%",
                  amount: fmt(INCOME_EXAMPLE * 0.6),
                },
                {
                  concept: "Reinversion en negocio/herramientas",
                  pct: "30%",
                  amount: fmt(INCOME_EXAMPLE * 0.3),
                },
                {
                  concept: "Ahorro personal",
                  pct: "10%",
                  amount: fmt(INCOME_EXAMPLE * 0.1),
                },
              ]}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Estrategia 2: 40-20-20-20 (Dividida y Protegida)" icon={Shield}>
          <div className="text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Ventaja:</strong> Reconoce explicitamente la carga
              tributaria colombiana. Recomendada para ingresos de ~$2M+ mensuales.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Gastos personales y familiares",
                  pct: "40%",
                  amount: fmt(INCOME_EXAMPLE * 0.4),
                },
                {
                  concept: "Impuestos y aportes (apartados)",
                  pct: "20%",
                  amount: fmt(INCOME_EXAMPLE * 0.2),
                },
                {
                  concept: "Ahorro e inversion",
                  pct: "20%",
                  amount: fmt(INCOME_EXAMPLE * 0.2),
                },
                {
                  concept: "Reinversion/oportunidades",
                  pct: "20%",
                  amount: fmt(INCOME_EXAMPLE * 0.2),
                },
              ]}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Estrategia 3: 50-15-20-15 (Enfoque en Activos)"
          icon={TrendingUp}
        >
          <div className="text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Mejor para:</strong> Independientes con ingresos
              estables + conocimiento financiero.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Gastos fijos",
                  pct: "50%",
                  amount: fmt(INCOME_EXAMPLE * 0.5),
                },
                {
                  concept: "Recreacion/lifestyle",
                  pct: "15%",
                  amount: fmt(INCOME_EXAMPLE * 0.15),
                },
                {
                  concept: "Ahorro e inversion en renta fija",
                  pct: "20%",
                  amount: fmt(INCOME_EXAMPLE * 0.2),
                },
                {
                  concept: "Inversion activa (fondos, acciones, cripto)",
                  pct: "15%",
                  amount: fmt(INCOME_EXAMPLE * 0.15),
                },
              ]}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Estrategia 4: 70-20-10 (Conservadora)" icon={AlertTriangle}>
          <div className="text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Contexto:</strong> Si mantienes padres, pareja,
              hijos necesitas margen de seguridad mayor.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Gastos totales (incluyendo familia)",
                  pct: "70%",
                  amount: fmt(INCOME_EXAMPLE * 0.7),
                },
                {
                  concept: "Ahorro forzado",
                  pct: "20%",
                  amount: fmt(INCOME_EXAMPLE * 0.2),
                },
                {
                  concept: "Inversion/largo plazo",
                  pct: "10%",
                  amount: fmt(INCOME_EXAMPLE * 0.1),
                },
              ]}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Modelo 50-20-30 Colombiano (Recomendado)"
          icon={Lightbulb}
          defaultOpen
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Una version adaptada de 50-20-30 optimizada para el contexto colombiano:</p>
            <StratTable
              rows={[
                {
                  concept: "Gastos fijos + tributarios",
                  pct: "50%",
                  amount: fmt(INCOME_EXAMPLE * 0.5),
                },
                {
                  concept: "  Vivienda",
                  pct: "30%",
                  amount: fmt(INCOME_EXAMPLE * 0.3),
                },
                {
                  concept: "  Servicios",
                  pct: "8%",
                  amount: fmt(INCOME_EXAMPLE * 0.08),
                },
                {
                  concept: "  Seguros",
                  pct: "4%",
                  amount: fmt(INCOME_EXAMPLE * 0.04),
                },
                {
                  concept: "  Aportes salud/pension",
                  pct: "8%",
                  amount: fmt(INCOME_EXAMPLE * 0.08),
                },
                {
                  concept: "Calidad de vida + disfrute",
                  pct: "20%",
                  amount: fmt(INCOME_EXAMPLE * 0.2),
                },
                {
                  concept: "  Alimentacion fuera",
                  pct: "8%",
                  amount: fmt(INCOME_EXAMPLE * 0.08),
                },
                {
                  concept: "  Entretenimiento",
                  pct: "7%",
                  amount: fmt(INCOME_EXAMPLE * 0.07),
                },
                {
                  concept: "  Viajes/ocio",
                  pct: "5%",
                  amount: fmt(INCOME_EXAMPLE * 0.05),
                },
                {
                  concept: "Ahorro e inversion",
                  pct: "30%",
                  amount: fmt(INCOME_EXAMPLE * 0.3),
                },
                {
                  concept: "  Fondo de emergencia",
                  pct: "15%",
                  amount: fmt(INCOME_EXAMPLE * 0.15),
                },
                {
                  concept: "  Inversion/retiro",
                  pct: "15%",
                  amount: fmt(INCOME_EXAMPLE * 0.15),
                },
              ]}
            />
            <div className="mt-2 rounded-lg bg-surface p-3">
              <p className="font-medium text-foreground">Por que funciona aqui?</p>
              <BulletList
                items={[
                  "Flexibilidad ante incertidumbre: si un mes cae tu ingreso 30%, el ahorro absorbe sin crisis.",
                  "Cumplimiento tributario sin estres: no sorpresas en declaracion de renta.",
                  "Acceso a credito: con 30% ahorro visible, bancos te ven como sujeto de credito.",
                  "Inversion compuesta: a 20 anos, ese 15% inversor genera patrimonio real.",
                ]}
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Caso Practico: Independiente con $4M/mes" icon={Calculator}>
          <div className="text-sm text-muted-foreground">
            <StratTable
              rows={[
                {
                  concept: "Gastos Fijos",
                  pct: "50%",
                  amount: fmt(INCOME_EXAMPLE * 0.5),
                },
                {
                  concept: "Recreacion",
                  pct: "20%",
                  amount: fmt(INCOME_EXAMPLE * 0.2),
                },
                {
                  concept: "Ahorro/Inversion",
                  pct: "30%",
                  amount: fmt(INCOME_EXAMPLE * 0.3),
                },
              ]}
            />
            <div className="mt-3 space-y-1 rounded-lg bg-surface p-3">
              <p>
                <strong className="text-foreground">Ahorro anual:</strong>{" "}
                {fmt(INCOME_EXAMPLE * 0.3 * 12)}
              </p>
              <p>
                <strong className="text-foreground">En 5 anos:</strong>{" "}
                {fmt(INCOME_EXAMPLE * 0.3 * 12 * 5)} de patrimonio base
              </p>
              <p>
                <strong className="text-foreground">A 10 anos con 6% rendimiento:</strong>{" "}
                ~$186.000.000
              </p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Senales para Ajustar tu Estrategia" icon={AlertTriangle}>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg bg-warning/10 p-3">
              <p className="font-medium text-warning">Aumenta ahorro a 40% si:</p>
              <BulletList
                items={[
                  "Tienes menos de 3 meses de gastos ahorrados.",
                  "Tus ingresos varian mas del 40% mes a mes.",
                  "Tienes proximos grandes gastos (educacion, vivienda).",
                ]}
              />
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="font-medium text-destructive">Reduce recreativos a 10% si:</p>
              <BulletList
                items={[
                  "Tu ingreso cayo sostenidamente.",
                  "Debes dinero a terceros.",
                  "La carga tributaria es impredecible.",
                ]}
              />
            </div>
            <div className="rounded-lg bg-success/10 p-3">
              <p className="font-medium text-success">Invierte agresivamente si:</p>
              <BulletList
                items={[
                  "Llevas mas de 2 anos con ingresos estables.",
                  "Ya tienes 6 meses de gastos ahorrados.",
                  "Tu edad es menor a 45 anos.",
                ]}
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Herramientas Practicas para Independientes" icon={Wrench}>
          <div className="mt-2 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Herramienta</th>
                  <th className="px-3 py-2 text-left font-medium">Uso</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    tool: "Conta/Wally",
                    use: "App para categorizar gastos automaticamente.",
                  },
                  {
                    tool: "Fondos de Inversion",
                    use: "Para el 15% de ahorro -> BTG, Acciones, Caja Social.",
                  },
                  {
                    tool: "Spreadsheet de flujo",
                    use: "Control semanal de ingresos vs egresos.",
                  },
                  {
                    tool: "Asesor tributario",
                    use: "Esencial -> te ahorra mas de lo que cuesta.",
                  },
                ].map((r) => (
                  <tr key={r.tool} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{r.tool}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      </div>
    </Card>
  );
}
