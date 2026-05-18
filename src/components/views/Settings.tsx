import { useState, useEffect } from "react";
import { Card, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useFinancialBudgetProfile, useUpdateFinancialBudgetProfile, useCreateFinancialBudgetProfile } from "@/lib/hooks/use-api";
import { fmtCurrency } from "@/lib/format";
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Palette,
  ChevronRight,
  Check,
  Wallet,
  Loader2,
} from "lucide-react";

const sections = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "financial", label: "Perfil Financiero", icon: Wallet },
  { id: "notifications", label: "Notificaciones", icon: Bell },
  { id: "security", label: "Seguridad", icon: Shield },
  { id: "billing", label: "Facturación", icon: CreditCard },
  { id: "language", label: "Idioma y Región", icon: Globe },
  { id: "appearance", label: "Apariencia", icon: Palette },
];

function SettingRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {value && <p className="text-xs text-muted-foreground mt-0.5">{value}</p>}
      </div>
      {children ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-surface-2"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

export function Settings() {
  const { user } = useAuth();
  const [active, setActive] = useState("profile");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifBudget, setNotifBudget] = useState(true);
  const [twoFa, setTwoFa] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const name = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Cost Manager User";
  const initials = user?.firstName ? user.firstName.substring(0, 2).toUpperCase() : "CM";

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Preferencias</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Configuración</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar nav */}
        <Card className="p-2 h-fit lg:col-span-1">
          <nav className="space-y-0.5">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left",
                    active === s.id
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      active === s.id ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-5">
          {active === "profile" && (
            <Card>
              <h3 className="font-display text-lg font-semibold mb-2">Perfil</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Administra tu información personal y detalles de la cuenta.
              </p>
              <div className="flex items-center gap-5 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-xl font-semibold text-primary-foreground shadow-glow">
                  {initials}
                </div>
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
                  <Badge tone="primary" className="mt-1.5">Premium</Badge>
                </div>
              </div>
              <div className="space-y-0">
                {[
                  { label: "Nombre completo", value: name },
                  { label: "Correo electrónico", value: user?.email || "" },
                  { label: "Usuario", value: user?.username ? `@${user.username}` : "" },
                  { label: "País", value: "Colombia 🇨🇴" },
                  { label: "Moneda", value: "USD ($)" },
                ].map((row) => (
                  <SettingRow key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            </Card>
          )}

          {active === "financial" && (
            <FinancialProfileSettings />
          )}

          {active === "notifications" && (
            <Card>
              <h3 className="font-display text-lg font-semibold mb-2">Notificaciones</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configura cuándo y cómo recibes alertas.
              </p>
              <SettingRow label="Notificaciones por correo" value="Resúmenes e informes por correo">
                <Toggle checked={notifEmail} onChange={setNotifEmail} />
              </SettingRow>
              <SettingRow label="Notificaciones push" value="Alertas en tu dispositivo">
                <Toggle checked={notifPush} onChange={setNotifPush} />
              </SettingRow>
              <SettingRow label="Alertas de presupuesto" value="Notificar cuando el gasto exceda el 80%">
                <Toggle checked={notifBudget} onChange={setNotifBudget} />
              </SettingRow>
            </Card>
          )}

          {active === "security" && (
            <Card>
              <h3 className="font-display text-lg font-semibold mb-2">Seguridad</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Protege tu cuenta con opciones avanzadas de seguridad.
              </p>
              <SettingRow label="Autenticación de dos factores" value="Añade una capa extra de seguridad">
                <Toggle checked={twoFa} onChange={setTwoFa} />
              </SettingRow>
              <SettingRow label="Cambiar contraseña" value="Último cambio hace 30 días" />
              <SettingRow label="Sesiones activas" value="2 dispositivos">
                <Badge tone="warning">Administrar</Badge>
              </SettingRow>
              <SettingRow label="Historial de accesos" value="Ver accesos recientes" />
            </Card>
          )}

          {active === "billing" && (
            <Card glow>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-display text-lg font-semibold">Facturación</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Administra tu suscripción y métodos de pago.
                  </p>
                </div>
                <Badge tone="success">Premium activo</Badge>
              </div>
              <div className="rounded-xl border border-border bg-surface/40 p-4 mb-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Plan actual</p>
                <p className="mt-1 font-display text-2xl font-semibold">Mindful Spend Mate Pro</p>
                <p className="text-sm text-muted-foreground mt-1">$9.99 / month · Renews Jun 1, 2026</p>
              </div>
              <SettingRow label="Método de pago" value="Visa terminada en 4242" />
              <SettingRow label="Historial de facturación" value="Ver facturas anteriores" />
            </Card>
          )}

          {active === "language" && (
            <Card>
              <h3 className="font-display text-lg font-semibold mb-2">Idioma y Región</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configura tu idioma preferido, zona horaria y formato de moneda.
              </p>
              <SettingRow label="Idioma" value="Español (Colombia)" />
              <SettingRow label="Zona horaria" value="America/Bogota (UTC−5)" />
              <SettingRow label="Formato de fecha" value="DD/MM/YYYY" />
              <SettingRow label="Formato de números" value="1.234,56" />
            </Card>
          )}

          {active === "appearance" && (
            <Card>
              <h3 className="font-display text-lg font-semibold mb-2">Apariencia</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Personaliza la apariencia de tu panel.
              </p>
              <div className="space-y-4">
                <p className="text-sm font-medium">Tema</p>
                <div className="flex gap-3">
                  {["Oscuro (Predeterminado)", "Sistema"].map((t) => (
                    <div
                      key={t}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-between rounded-xl border p-4 transition",
                        t === "Oscuro (Predeterminado)"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-surface/40 hover:border-muted-foreground"
                      )}
                    >
                      <span className="text-sm font-medium">{t}</span>
                      {t === "Oscuro (Predeterminado)" && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all",
                saved ? "bg-success" : "bg-gradient-primary hover:opacity-90"
              )}
            >
              {saved ? (
                <><Check className="h-4 w-4" /> ¡Guardado!</>
              ) : (
                "Guardar cambios"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialProfileSettings() {
  const { userId } = useAuth();
  const { data: profile, isLoading, error } = useFinancialBudgetProfile();
  const createProfile = useCreateFinancialBudgetProfile();
  const updateProfile = useUpdateFinancialBudgetProfile();

  const [needsRatio, setNeedsRatio] = useState(50);
  const [wantsRatio, setWantsRatio] = useState(30);
  const [savingsRatio, setSavingsRatio] = useState(20);
  const [maxDebtRatio, setMaxDebtRatio] = useState(40);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setNeedsRatio(profile.needs_ratio);
      setWantsRatio(profile.wants_ratio);
      setSavingsRatio(profile.savings_ratio);
      setMaxDebtRatio(profile.max_debt_ratio);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      if (!profile) {
        await createProfile.mutateAsync({
          user_id: userId,
          needs_ratio: needsRatio,
          wants_ratio: wantsRatio,
          savings_ratio: savingsRatio,
          max_debt_ratio: maxDebtRatio,
        });
      } else {
        await updateProfile.mutateAsync({
          needs_ratio: needsRatio,
          wants_ratio: wantsRatio,
          savings_ratio: savingsRatio,
          max_debt_ratio: maxDebtRatio,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const hasProfile = !error && profile;

  return (
    <Card>
      <h3 className="font-display text-lg font-semibold mb-2">Perfil Financiero</h3>
      <p className="text-sm text-muted-foreground mb-6">
        {hasProfile 
          ? "Actualiza tu presupuesto personalizado basado en la regla 50/30/20."
          : "Configura tu presupuesto personalizado basado en la regla 50/30/20."}
      </p>

      {!hasProfile && (
        <div className="p-4 bg-surface-2 rounded-xl text-center mb-4">
          <p className="text-sm text-muted-foreground">
            No tienes un perfil financiero configurado.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Configura tus objetivos de ahorro usando los ratios predeterminados.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <RatioSlider label="Necesidades" value={needsRatio} onChange={setNeedsRatio} color="primary" />
        <RatioSlider label="Deseos" value={wantsRatio} onChange={setWantsRatio} color="warning" />
        <RatioSlider label="Ahorros" value={savingsRatio} onChange={setSavingsRatio} color="success" />
        <RatioSlider label="Deuda máxima" value={maxDebtRatio} onChange={setMaxDebtRatio} color="destructive" />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all bg-gradient-primary hover:opacity-90 disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <><Check className="h-4 w-4" /> ¡Guardado!</>
          ) : (
            hasProfile ? "Guardar cambios" : "Crear perfil"
          )}
        </button>
      </div>
    </Card>
  );
}

function RatioSlider({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary",
    warning: "bg-warning",
    success: "bg-success",
    destructive: "bg-destructive",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">0%</span>
        <span className="text-xs text-muted-foreground">100%</span>
      </div>
    </div>
  );
}
