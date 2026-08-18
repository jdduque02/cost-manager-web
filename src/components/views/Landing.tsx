import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  Lock,
  Check,
  type LucideIcon,
} from "lucide-react";
import { SprigIsotipo } from "@/components/brand/sprig-isotipo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { RevealSection } from "@/components/ui/reveal-section";
import { useCountUp } from "@/hooks/use-count-up";

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);

function MiniBar({ index, color }: { index: number; color: string }) {
  const grown = useCountUp(1, { duration: 700, delay: 450 + index * 60 });
  return (
    <div
      className={`origin-bottom flex-1 rounded-sm ${color}`}
      style={{ height: "100%", transform: `scaleY(${grown})` }}
    />
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-glow">
        <SprigIsotipo className="h-5 w-5" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Sprig</span>
    </Link>
  );
}

function HeroMockup() {
  const netWorth = useCountUp(12480.5, { duration: 1200, delay: 450 });
  const growth = useCountUp(8.2, { duration: 1200, delay: 450 });

  return (
    <div className="relative mx-auto mt-16 w-full max-w-3xl motion-reduce:animate-none animate-in fade-in-0 slide-in-from-bottom-6 duration-700 ease-out [animation-delay:250ms]">
      <div className="glow-border rounded-2xl p-6 shadow-elegant">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-xs text-muted-foreground">Patrimonio neto</p>
            <p className="font-display text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              $ {fmtUsd(netWorth)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success tabular-nums">
            <TrendingUp className="h-3.5 w-3.5" /> +{growth.toFixed(1)}% este mes
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-gradient-card p-3">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="mt-1 font-display text-lg font-semibold text-success tabular-nums">
              $ 4,200
            </p>
            <div className="mt-2 flex h-10 items-end gap-1">
              {[40, 65, 45, 80, 60, 95].map((h, i) => (
                <MiniBar key={`bar-${h}`} index={i} color="bg-success/40" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-gradient-card p-3">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="mt-1 font-display text-lg font-semibold text-foreground tabular-nums">
              $ 2,845
            </p>
            <div className="mt-2 flex h-10 items-end gap-1">
              {[70, 45, 85, 50, 65, 55].map((h, i) => (
                <MiniBar key={`bar-${h}`} index={i} color="bg-info/40" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-gradient-card p-3">
            <p className="text-xs text-muted-foreground">Ahorro</p>
            <p className="mt-1 font-display text-lg font-semibold text-primary tabular-nums">32%</p>
            <div className="mt-2 flex h-10 items-end gap-1">
              {[30, 50, 35, 70, 55, 88].map((h, i) => (
                <MiniBar key={`bar-${h}`} index={i} color="bg-primary/50" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { name: "Supermercado", amount: "-$ 86.40", icon: Wallet },
            { name: "Salario · Nómina", amount: "+$ 2,100.00", icon: ArrowLeftRight },
            { name: "Suscripciones", amount: "-$ 14.99", icon: BarChart3 },
          ].map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2">
                  <row.icon className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="text-sm text-foreground">{row.name}</span>
              </div>
              <span
                className={cn(
                  "font-display text-sm font-semibold",
                  row.amount.startsWith("+") ? "text-success" : "text-foreground",
                )}
              >
                {row.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {[
            { href: "#funciones", label: "Funciones" },
            { href: "#como-funciona", label: "Cómo funciona" },
            { href: "#seguridad", label: "Seguridad" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Link
          to={isAuthenticated ? "/dashboard" : "/login"}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-105 active:scale-[0.98]"
        >
          {isAuthenticated ? "Ir al panel" : "Iniciar sesión"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-6 sm:pt-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ring/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-gradient-card px-4 py-1.5 text-xs font-medium text-muted-foreground motion-reduce:animate-none animate-[fade-blur-in_0.8s_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:100ms]">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Tu panorama financiero en un solo lugar
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold tracking-tight text-balance sm:text-6xl motion-reduce:animate-none animate-[fade-blur-in_0.9s_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:200ms]">
          Controla tus gastos,{" "}
          <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
            multiplica tu ahorro
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground motion-reduce:animate-none animate-[fade-blur-in_0.9s_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:300ms] sm:text-lg">
          Presupuestos, reportes, metas de ahorro e inteligencia fiscal para decisiones informadas.
          Simple de usar, seguro por diseño.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row motion-reduce:animate-none animate-[fade-blur-in_0.9s_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:400ms]">
          <Link
            to={isAuthenticated ? "/dashboard" : "/login"}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-primary px-7 text-base font-semibold text-primary-foreground transition hover:brightness-105 active:scale-[0.98]"
          >
            {isAuthenticated ? "Ir al panel" : "Comenzar gratis"}
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#funciones"
            className="inline-flex h-12 items-center rounded-xl border border-border bg-background px-7 text-base font-medium text-foreground transition hover:border-ring/50 hover:bg-accent"
          >
            Explorar funciones
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground motion-reduce:animate-none animate-[fade-blur-in_0.9s_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:500ms]">
          {["Sin tarjeta de crédito", "Tus datos cifrados", "Acceso multidispositivo"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-success" /> {t}
            </span>
          ))}
        </div>
      </div>

      <HeroMockup />
    </section>
  );
}

function Features() {
  const features: { icon: LucideIcon; title: string; description: string }[] = [
    {
      icon: ArrowLeftRight,
      title: "Transacciones claras",
      description: "Registra y categoriza tus movimientos al instante, con plantillas y divisas.",
    },
    {
      icon: BarChart3,
      title: "Reportes profundos",
      description: "Gráficas y desgloses por categoría para entender a dónde va tu dinero.",
    },
    {
      icon: Sparkles,
      title: "Inteligencia e impuestos",
      description: "Proyección de impuestos y consejos fiscales con base en tus movimientos.",
    },
    {
      icon: Target,
      title: "Metas de ahorro",
      description: "Define objetivos, sigue tu progreso y celebra cada hito alcanzado.",
    },
    {
      icon: Wallet,
      title: "Patrimonio en vivo",
      description: "Saldos, cuentas y activos consolidados en una sola vista.",
    },
    {
      icon: PiggyBank,
      title: "Ahorro inteligente",
      description: "Sugerencias automáticas para recortar gastos y aumentar tu ahorro.",
    },
  ];

  return (
    <section id="funciones" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <RevealSection className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Todo lo que necesitas para decidir mejor
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Una plataforma que reúne tus finanzas personales para que tomes el control.
          </p>
        </RevealSection>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <RevealSection key={feature.title} delay={(i % 3) * 80}>
              <div className="group h-full rounded-2xl border border-border bg-gradient-card p-6 transition-[transform,box-shadow,border-color] duration-200 ease-out-soft hover:-translate-y-1.5 hover:border-ring/40 hover:shadow-elegant">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Crea tu cuenta",
      description: "Regístrate en menos de un minuto. Sin tarjetas, sin complicaciones.",
    },
    {
      step: "02",
      title: "Registra tus finanzas",
      description:
        "Agrega tus ingresos y gastos, o importa tus movimientos con nuestras plantillas.",
    },
    {
      step: "03",
      title: "Decide con datos",
      description: "Revisa reportes, alcanza metas y ahorra más con recomendaciones inteligentes.",
    },
  ];

  return (
    <section
      id="como-funciona"
      className="scroll-mt-24 border-y border-border bg-gradient-card px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <RevealSection className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Cómo funciona
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            De la idea a tu primer ahorro en tres pasos.
          </p>
        </RevealSection>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <RevealSection key={s.step} delay={i * 100}>
              <div className="relative h-full rounded-2xl border border-border bg-background p-6">
                <span className="font-display text-sm font-semibold text-primary">{s.step}</span>
                <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  const items = [
    {
      icon: Lock,
      title: "Cifrado de datos",
      description: "Tu información viaja y se almacena cifrada, con credenciales protegidas.",
    },
    {
      icon: ShieldCheck,
      title: "Control de acceso",
      description: "Roles y permisos definidos, con sesiones revocables en cualquier momento.",
    },
    {
      icon: TrendingUp,
      title: "Disponibilidad",
      description: "Infraestructura preparada para responder rápido, incluso en picos de uso.",
    },
  ];

  return (
    <section id="seguridad" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <RevealSection>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-gradient-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Seguridad
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Construido para proteger lo que más importa
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Tu información financiera es sensible. Por eso cada capa de Sprig está diseñada con
            privacidad y control de acceso desde el primer día.
          </p>
        </RevealSection>

        <div className="space-y-4">
          {items.map((item, i) => (
            <RevealSection key={item.title} delay={i * 80}>
              <div className="flex gap-4 rounded-2xl border border-border bg-gradient-card p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="px-4 pb-24 sm:px-6">
      <RevealSection className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-ring/30 bg-gradient-card px-6 py-16 text-center shadow-elegant sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Empieza a tomar el control de tus finanzas hoy
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Únete a Sprig y convierte tus gastos en decisiones inteligentes.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={isAuthenticated ? "/dashboard" : "/login"}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-primary px-7 text-base font-semibold text-primary-foreground transition hover:brightness-105 active:scale-[0.98]"
              >
                {isAuthenticated ? "Ir al panel" : "Comenzar gratis"}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/register"
                className="inline-flex h-12 items-center rounded-xl border border-border bg-background px-7 text-base font-medium text-foreground transition hover:border-ring/50 hover:bg-accent"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </RevealSection>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <Logo />
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { href: "#funciones", label: "Funciones" },
            { href: "#como-funciona", label: "Cómo funciona" },
            { href: "#seguridad", label: "Seguridad" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/login"
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Iniciar sesión
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sprig. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="relative min-h-screen text-foreground">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Security />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
