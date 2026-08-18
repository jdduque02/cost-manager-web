import { useState } from "react";
import {
  Users,
  GraduationCap,
  Building2,
  Shield,
  Heart,
  Crown,
  ChevronDown,
  ChevronUp,
  Briefcase,
} from "lucide-react";
import { Card } from "@/components/ui/primitives";

const COLORS: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-400",
  green: "bg-emerald-500/10 text-emerald-400",
  amber: "bg-amber-500/10 text-amber-400",
  rose: "bg-rose-500/10 text-rose-400",
  purple: "bg-violet-500/10 text-violet-400",
  teal: "bg-teal-500/10 text-teal-400",
};

function Section({
  title,
  icon: Icon,
  age,
  color,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  age: string;
  color: string;
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
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${COLORS[color] || COLORS.blue}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold">{title}</span>
          <span className="ml-2 text-xs text-muted-foreground">{age}</span>
        </div>
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

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

export function LifeStageGuide() {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <Briefcase className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">
            Estrategia de Capital por Etapas de Vida
          </h3>
          <p className="text-xs text-muted-framework">
            Framework colombiano: 5 capitales segun tu edad
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-surface p-3">
        <p className="text-sm font-medium text-foreground">Los 5 Capitales a Desarrollar</p>
        <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
          <span>&#127760; Social: Red de contactos, relaciones, influencia</span>
          <span>&#128170; Humano: Habilidades, educacion, experiencia</span>
          <span>&#129657; Fisico: Salud, energia, vivienda</span>
          <span>&#128218; Intelectual: Conocimiento, certificaciones</span>
          <span>&#128176; Economico: Dinero, activos, patrimonio</span>
        </div>
      </div>

      <div className="space-y-3">
        <Section
          title="Etapa 1: Acumulacion de Capital Social"
          icon={Users}
          age="18-25 anos"
          color="blue"
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Enfoque:</strong> Construir red de contactos,
              mentores, comunidades. Tu tiempo vale menos a esta edad, usalo para conectar.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Desarrollo personal / cursos",
                  pct: "70%",
                  amount: fmt(1500000 * 0.7),
                },
                {
                  concept: "Gastos basicos",
                  pct: "20%",
                  amount: fmt(1500000 * 0.2),
                },
                {
                  concept: "Fondo emergencia minimo",
                  pct: "10%",
                  amount: fmt(1500000 * 0.1),
                },
              ]}
            />
            <div className="rounded-lg bg-surface p-3">
              <p className="font-medium text-foreground">Meta de patrimonio: $0 - $2.000.000</p>
              <BulletList
                items={[
                  "Asistir eventos, conferencias, meetups de tu industria",
                  "Invertir en bootcamps, certificaciones, cursos online",
                  "Deportes y prevencion de salud (bajo costo)",
                  "Una conexion hoy puede traer $10M en oportunidades en 5 anos",
                ]}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Etapa 2: Construccion del Capital Humano"
          icon={GraduationCap}
          age="25-35 anos"
          color="green"
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Enfoque:</strong> Especializarte, escalar
              ingresos, comenzar patrimonio. Regla 50-20-30 base.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Gastos fijos (vivienda + servicios)",
                  pct: "50%",
                  amount: fmt(4000000 * 0.5),
                },
                {
                  concept: "Recreacion / networking",
                  pct: "20%",
                  amount: fmt(4000000 * 0.2),
                },
                {
                  concept: "Ahorro e inversion",
                  pct: "30%",
                  amount: fmt(4000000 * 0.3),
                },
              ]}
            />
            <div className="rounded-lg bg-surface p-3">
              <p className="font-medium text-foreground">
                Meta de patrimonio: $20.000.000 - $80.000.000
              </p>
              <BulletList
                items={[
                  "Postgrados, especializacion, aumentar tarifa",
                  "Seguros de vida, chequeos preventivos",
                  "Fondos de inversion: Skandia, Proteccion (6-8% anual)",
                  "Primer inmueble si ingresos sostenibles +3 anos",
                  "Si tienes dependientes -> ajustar a 70-20-10",
                ]}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Etapa 3: Consolidacion del Capital Economico"
          icon={Building2}
          age="35-45 anos"
          color="amber"
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Enfoque:</strong> Maximizar ingresos, construir
              patrimonio serio. Momento ideal para riesgo calculado.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Gastos fijos (familia, vivienda)",
                  pct: "40%",
                  amount: fmt(8000000 * 0.4),
                },
                {
                  concept: "Inversion (inmueble, fondos, negocios)",
                  pct: "30%",
                  amount: fmt(8000000 * 0.3),
                },
                {
                  concept: "Recreacion / calidad de vida",
                  pct: "20%",
                  amount: fmt(8000000 * 0.2),
                },
                {
                  concept: "Impuestos / contingencias",
                  pct: "10%",
                  amount: fmt(8000000 * 0.1),
                },
              ]}
            />
            <div className="rounded-lg bg-surface p-3">
              <p className="font-medium text-foreground">
                Meta de patrimonio: $150.000.000 - $400.000.000
              </p>
              <BulletList
                items={[
                  "2da-3era propiedad (arrendamiento = renta pasiva)",
                  "Fondos agresivos: SPP, fondos de acciones",
                  "Negocios: consultoria, productos digitales, SaaS",
                  "Fondos educativos para hijos (empiezan a los 36)",
                  "Maximo potencial de ingresos: experiencia + anos para recuperarse",
                ]}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Etapa 4: Proteccion del Capital Economico"
          icon={Shield}
          age="45-55 anos"
          color="rose"
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Enfoque:</strong> Proteger lo ganado, reducir
              riesgo, preparar retiro. Debes ver claro como vives sin trabajar.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Gastos fijos (vivienda pagada)",
                  pct: "35%",
                  amount: fmt(12000000 * 0.35),
                },
                {
                  concept: "Ahorro/inversion conservadora",
                  pct: "40%",
                  amount: fmt(12000000 * 0.4),
                },
                {
                  concept: "Recreacion / calidad de vida",
                  pct: "25%",
                  amount: fmt(12000000 * 0.25),
                },
              ]}
            />
            <div className="rounded-lg bg-surface p-3">
              <p className="font-medium text-foreground">
                Meta de patrimonio: $400.000.000 - $800.000.000
              </p>
              <BulletList
                items={[
                  "Renta fija: bonos del gobierno, CDTs, fondos (4-6% anual)",
                  "SPP (Pension Voluntaria): aportes adicionales para retiro",
                  "Seguros: vida, invalidez, responsabilidad civil",
                  "Dividendos: Bancolombia, Ecopetrol, Grupo Aval",
                  "Meta de retiro: ingresos pasivos $3M+/mes",
                ]}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Etapa 5: Preparacion al Retiro"
          icon={Heart}
          age="55-65 anos"
          color="purple"
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Enfoque:</strong> Salud, ingresos pasivos,
              transicion a retiro. Ya no trabajas por necesidad.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Gastos personales / salud",
                  pct: "30%",
                  amount: fmt(10000000 * 0.3),
                },
                {
                  concept: "Consolidacion ingresos pasivos",
                  pct: "50%",
                  amount: fmt(10000000 * 0.5),
                },
                {
                  concept: "Transferencia / contingencias",
                  pct: "20%",
                  amount: fmt(10000000 * 0.2),
                },
              ]}
            />
            <div className="rounded-lg bg-surface p-3">
              <p className="font-medium text-foreground">
                Meta de patrimonio: $700.000.000 - $1.200.000.000
              </p>
              <BulletList
                items={[
                  "Cartera de dividendos: Bancolombia, Grupo Sura, Celsia",
                  "Rentas vitalicias: convertir patrimonio en ingreso de por vida",
                  "Inmuebles arrendados: flujo pasivo mensual",
                  "SPP fondos conservadores de administradoras",
                  "Transicion a retiro activo: trabajo por proposito, no necesidad",
                ]}
              />
            </div>
          </div>
        </Section>

        <Section title="Etapa 6: Retiro y Legado" icon={Crown} age="65+ anos" color="teal">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Enfoque:</strong> Salud, legado, disfrute,
              transferencia generacional. Tu dinero sigue generando valor.
            </p>
            <StratTable
              rows={[
                {
                  concept: "Gastos personales / familia",
                  pct: "50%",
                  amount: fmt(6000000 * 0.5),
                },
                {
                  concept: "Ayuda familia / legado",
                  pct: "30%",
                  amount: fmt(6000000 * 0.3),
                },
                {
                  concept: "Contingencias / colchon",
                  pct: "20%",
                  amount: fmt(6000000 * 0.2),
                },
              ]}
            />
            <div className="rounded-lg bg-surface p-3">
              <p className="font-medium text-foreground">Meta: preservar y transferir patrimonio</p>
              <BulletList
                items={[
                  "Rentas vitalicias: ingreso garantizado de por vida",
                  "Bonos seguros: cero riesgo (gobierno)",
                  "Trust/fideicomisos: proteger patrimonio y transferencias",
                  "Seguros de vida para herederos",
                  "Educacion de nietos: fondos educativos desde nacimiento",
                ]}
              />
            </div>
          </div>
        </Section>

        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-2 text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Edad</th>
                <th className="px-3 py-2 text-left font-medium">Capital</th>
                <th className="px-3 py-2 text-right font-medium">% Ahorro</th>
                <th className="px-3 py-2 text-right font-medium">Patrimonio Meta</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  age: "18-25",
                  cap: "Social + Humano",
                  save: "10%",
                  target: "$0-2M",
                },
                {
                  age: "25-35",
                  cap: "Humano + Economico",
                  save: "30%",
                  target: "$20-80M",
                },
                {
                  age: "35-45",
                  cap: "Economico",
                  save: "40%",
                  target: "$150-400M",
                },
                {
                  age: "45-55",
                  cap: "Economico + Fisico",
                  save: "40%",
                  target: "$400-800M",
                },
                {
                  age: "55-65",
                  cap: "Fisico + Economico",
                  save: "50%",
                  target: "$700M-1.2B",
                },
                {
                  age: "65+",
                  cap: "Fisico + Social",
                  save: "N/A",
                  target: "Preservar",
                },
              ].map((r) => (
                <tr key={r.age} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{r.age}</td>
                  <td className="px-3 py-2">{r.cap}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.save}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {r.target}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg bg-warning/10 p-3 text-sm">
          <p className="font-medium text-warning">Error mas comun en colombianos</p>
          <BulletList
            items={[
              "A los 35 anos siguen con mentalidad de 25: gastan 50% en lujos, no han comprado inmueble",
              "Solucion: ajusta tu % de ahorro cada 5 anos automaticamente",
              "25 anos: 10% -> 30 anos: 30% -> 35 anos: 35% -> 40 anos: 40%",
            ]}
          />
        </div>
      </div>
    </Card>
  );
}
