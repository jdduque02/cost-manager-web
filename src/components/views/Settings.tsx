import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Card, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useAuth } from "@/lib/auth";
import {
  useFinancialBudgetProfile,
  useUpdateFinancialBudgetProfile,
  useCreateFinancialBudgetProfile,
  useUpdateUser,
} from "@/lib/hooks/use-api";
import {
  User,
  Bell,
  Shield,
  Globe,
  Palette,
  ChevronRight,
  Check,
  Wallet,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

const sections = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "financial", label: "Perfil Financiero", icon: Wallet },
  { id: "notifications", label: "Notificaciones", icon: Bell },
  { id: "security", label: "Seguridad", icon: Shield },
  { id: "language", label: "Idioma y Region", icon: Globe },
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
        checked ? "bg-primary" : "bg-surface-2",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export function Settings() {
  const [active, setActive] = useState("profile");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifBudget, setNotifBudget] = useState(true);
  const [twoFa, setTwoFa] = useState(false);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Preferencias</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Configuracion</h1>
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
                    "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out text-left",
                    active === s.id
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      active === s.id ? "text-primary" : "text-muted-foreground",
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
          {active === "profile" && <ProfileSettings />}

          {active === "financial" && <FinancialProfileSettings />}

          {active === "notifications" && (
            <Card>
              <h3 className="font-display text-lg font-semibold mb-2">Notificaciones</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configura cuando y como recibes alertas.
              </p>
              <SettingRow label="Notificaciones por correo" value="Resumenes e informes por correo">
                <Toggle checked={notifEmail} onChange={setNotifEmail} />
              </SettingRow>
              <SettingRow label="Notificaciones push" value="Alertas en tu dispositivo">
                <Toggle checked={notifPush} onChange={setNotifPush} />
              </SettingRow>
              <SettingRow
                label="Alertas de presupuesto"
                value="Notificar cuando el gasto exceda el 80%"
              >
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
              <SettingRow
                label="Autenticacion de dos factores"
                value="Anade una capa extra de seguridad"
              >
                <Toggle checked={twoFa} onChange={setTwoFa} />
              </SettingRow>
              <SettingRow label="Cambiar contrasena" value="Ultimo cambio hace 30 dias" />
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
                  <h3 className="font-display text-lg font-semibold">Facturacion</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Administra tu suscripcion y metodos de pago.
                  </p>
                </div>
                <Badge tone="success">Premium activo</Badge>
              </div>
              <div className="rounded-xl border border-border bg-surface/40 p-4 mb-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Plan actual
                </p>
                <p className="mt-1 font-display text-2xl font-semibold">Mindful Spend Mate Pro</p>
                <p className="text-sm text-muted-foreground mt-1">
                  $9.99 / month · Renews Jun 1, 2026
                </p>
              </div>
              <SettingRow label="Metodo de pago" value="Visa terminada en 4242" />
              <SettingRow label="Historial de facturacion" value="Ver facturas anteriores" />
            </Card>
          )}

          {active === "language" && (
            <Card>
              <h3 className="font-display text-lg font-semibold mb-2">Idioma y Region</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configura tu idioma preferido, zona horaria y formato de moneda.
              </p>
              <SettingRow label="Idioma" value="Espanol (Colombia)" />
              <SettingRow label="Zona horaria" value="America/Bogota (UTC-5)" />
              <SettingRow label="Formato de fecha" value="DD/MM/YYYY" />
              <SettingRow label="Formato de numeros" value="1.234.567" />
            </Card>
          )}

          {active === "appearance" && <AppearanceSection />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user, userId, refreshUser } = useAuth();
  const updateUser = useUpdateUser();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [address, setAddress] = useState("");
  const [locale, setLocale] = useState("es");
  const [timezone, setTimezone] = useState("America/Bogota");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setDocumentId(user.document_id ?? "");
    setAddress(user.address ?? "");
    setLocale(user.locale ?? "es");
    setTimezone(user.timezone ?? "America/Bogota");
  }, [user]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateUser.mutateAsync({
        full_name: fullName.trim() || null,
        email: email.trim() || undefined,
        phone: phone.trim() || null,
        document_id: documentId.trim() || null,
        address: address.trim() || null,
        locale,
        timezone,
      });
      await refreshUser();
      setSaved(true);
      toast.success("Perfil actualizado correctamente");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : "CM";

  return (
    <Card>
      <h3 className="font-display text-lg font-semibold mb-2">Perfil</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Administra tu informacion personal y detalles de la cuenta.
      </p>

      <div className="flex items-center gap-5 mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-xl font-semibold text-primary-foreground shadow-glow">
          {initials}
        </div>
        <div>
          <p className="font-medium">{user?.full_name || user?.username || "Cost Manager User"}</p>
          <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
        </div>
      </div>

      <div className="space-y-0 mb-6">
        <SettingRow label="Usuario" value={user?.username ? `@${user.username}` : ""} />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full-name">Nombre completo</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tu nombre completo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo electronico</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
          <p className="text-xs text-muted-foreground">
            El correo se sincroniza con tu cuenta de acceso (Keycloak).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-id">Documento de identidad</Label>
          <Input
            id="document-id"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder="Cedula / Pasaporte"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefono</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+57 300 123 4567"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Direccion</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Direccion de residencia"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Pais / Idioma</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Colombia</SelectItem>
                <SelectItem value="en">Estados Unidos</SelectItem>
                <SelectItem value="fr">Francia</SelectItem>
                <SelectItem value="pt">Brasil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Zona horaria</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Bogota">America/Bogota (UTC-5)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                <SelectItem value="America/Mexico_City">America/Mexico_City (UTC-6)</SelectItem>
                <SelectItem value="Europe/Madrid">Europe/Madrid (UTC+1)</SelectItem>
                <SelectItem value="Etc/UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-150 ease-out",
            saved ? "bg-success" : "bg-gradient-primary hover:opacity-90",
            saving && "opacity-70",
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" /> Guardado!
            </>
          ) : (
            "Guardar cambios"
          )}
        </button>
      </div>
    </Card>
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
  const [investmentRatio, setInvestmentRatio] = useState(10);
  const [maxDebtRatio, setMaxDebtRatio] = useState(40);
  const [salary, setSalary] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setNeedsRatio(profile.needs_ratio);
      setWantsRatio(profile.wants_ratio);
      setSavingsRatio(profile.savings_ratio);
      setInvestmentRatio(profile.investment_ratio);
      setMaxDebtRatio(profile.max_debt_ratio);
      setSalary(profile.monthly_income != null ? String(profile.monthly_income) : "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!userId) return;

    const totalRatio = needsRatio + wantsRatio + savingsRatio + investmentRatio + maxDebtRatio;
    if (totalRatio > 100) {
      toast.error(
        `La suma de los porcentajes supera el 100% (${totalRatio}%). Revisa los valores.`,
      );
      return;
    }

    setSaving(true);
    try {
      const monthlyIncome = salary ? Number(salary.replace(/[^0-9]/g, "")) || undefined : undefined;
      const dto = {
        needs_ratio: needsRatio,
        wants_ratio: wantsRatio,
        savings_ratio: savingsRatio,
        investment_ratio: investmentRatio,
        max_debt_ratio: maxDebtRatio,
        monthly_income: monthlyIncome,
      };
      if (!profile) {
        await createProfile.mutateAsync({ user_id: userId, ...dto });
      } else {
        await updateProfile.mutateAsync(dto);
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
        <div className="space-y-1.5">
          <Label>Salario mensual (COP)</Label>
          <CurrencyInput value={salary} onChange={setSalary} placeholder="Ej. 3.500.000" />
          <p className="text-xs text-muted-foreground">
            Se almacena cifrado. Se usa para calcular tus límites por rango.
          </p>
        </div>
        <RatioSlider
          label="Necesidades"
          value={needsRatio}
          onChange={setNeedsRatio}
          color="primary"
        />
        <RatioSlider label="Deseos" value={wantsRatio} onChange={setWantsRatio} color="warning" />
        <RatioSlider
          label="Ahorros"
          value={savingsRatio}
          onChange={setSavingsRatio}
          color="success"
        />
        <RatioSlider
          label="Inversión"
          value={investmentRatio}
          onChange={setInvestmentRatio}
          color="info"
        />
        <RatioSlider
          label="Deuda maxima"
          value={maxDebtRatio}
          onChange={setMaxDebtRatio}
          color="destructive"
        />

        <div
          className={cn(
            "flex items-center justify-between rounded-xl border p-3 text-sm",
            needsRatio + wantsRatio + savingsRatio + investmentRatio + maxDebtRatio > 100
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-border bg-surface text-muted-foreground",
          )}
        >
          <span className="font-medium">Total asignado</span>
          <span className="font-semibold">
            {needsRatio + wantsRatio + savingsRatio + investmentRatio + maxDebtRatio}%
            {needsRatio + wantsRatio + savingsRatio + investmentRatio + maxDebtRatio > 100 &&
              " · supera el 100%"}
          </span>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-150 ease-out bg-gradient-primary hover:opacity-90 disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="h-4 w-4" /> Guardado!
            </>
          ) : hasProfile ? (
            "Guardar cambios"
          ) : (
            "Crear perfil"
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
    info: "bg-info",
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

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const themes = [
    { value: "light", label: "Claro", icon: Sun, description: "Tema claro para uso diurno" },
    { value: "dark", label: "Oscuro", icon: Moon, description: "Tema oscuro (predeterminado)" },
    {
      value: "system",
      label: "Sistema",
      icon: Monitor,
      description: "Usar preferencia del sistema",
    },
  ];

  function handleThemeChange(value: string) {
    document.documentElement.classList.add("theme-transitioning");
    setTheme(value);
    setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 300);
  }

  return (
    <Card>
      <h3 className="font-display text-lg font-semibold mb-2">Apariencia</h3>
      <p className="text-sm text-muted-foreground mb-6">Personaliza la apariencia de tu panel.</p>
      <div className="space-y-4">
        <p className="text-sm font-medium">Tema</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themes.map(({ value, label, icon: Icon, description }) => {
            const active = mounted ? theme === value : value === "dark";
            return (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 ease-out",
                  active
                    ? "border-primary bg-primary/5 shadow-glow"
                    : "border-border bg-surface/40 hover:border-muted-foreground hover:bg-surface/60",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                <span className="text-xs text-muted-foreground text-center">{description}</span>
                {active && <Check className="h-4 w-4 text-primary mt-1" />}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
