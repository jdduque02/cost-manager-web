import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Check, X } from "lucide-react";
import { SprigIsotipo } from "@/components/brand/sprig-isotipo";
import { ApiError } from "@/lib/api/client";
import type { ValidationErrorDetail } from "@/lib/api/client";
import { identityApi } from "@/lib/api/identity";
import { LEGAL_VERSION } from "@/content/legal";

import { t } from "@/lib/i18n/errors";
const PASSWORD_RULES = [
  { key: "minLength", test: (p: string) => p.length >= 12, label: "Minimo 12 caracteres" },
  {
    key: "upperCase",
    test: (p: string) => (p.match(/[A-Z]/g) ?? []).length >= 2,
    label: "2 mayusculas",
  },
  {
    key: "lowerCase",
    test: (p: string) => (p.match(/[a-z]/g) ?? []).length >= 2,
    label: "2 minusculas",
  },
  { key: "digits", test: (p: string) => (p.match(/\d/g) ?? []).length >= 2, label: "2 numeros" },
  { key: "special", test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "1 caracter especial" },
] as const;

function PasswordHints({ password, id }: { password: string; id: string }) {
  return (
    <ul id={id} className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.key} className="flex items-center gap-1.5 text-xs">
            {ok ? (
              <Check className="h-3 w-3 text-success" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={ok ? "text-success" : "text-muted-foreground"}>{rule.label}</span>
            <span className="sr-only">{ok ? " (cumplido)" : " (pendiente)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

function fieldErrors(details: ValidationErrorDetail[], field: string): string | undefined {
  for (const d of details) {
    if (d.property === field) {
      const msgs = Object.values(d.constraints);
      return msgs.length ? msgs[0] : undefined;
    }
  }
  return undefined;
}

const inputCls = (invalid?: boolean) =>
  `w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-ring ${
    invalid ? "border-destructive" : "border-border"
  }`;
const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

export function Register() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const ids = {
    fullName: "reg-fullname",
    username: "reg-username",
    email: "reg-email",
    password: "reg-password",
    hints: "reg-password-hints",
    confirm: "reg-confirm",
    consent: "reg-consent",
  };

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldDetails, setFieldDetails] = useState<ValidationErrorDetail[]>([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, navigate]);

  const passwordValid = useMemo(() => PASSWORD_RULES.every((r) => r.test(password)), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !fullName) {
      setError(t("err.register.required"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("err.register.mismatch"));
      return;
    }
    if (!passwordValid) {
      setError(t("err.register.weak"));
      return;
    }
    if (!accepted) {
      setError(t("err.register.consent"));
      return;
    }

    setLoading(true);
    setError("");
    setFieldDetails([]);

    try {
      await identityApi.createUser({
        username,
        email,
        password,
        full_name: fullName,
        accepted_terms_version: LEGAL_VERSION,
        locale: "es",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        metadata: {
          prefered_theme: "dark",
          notifications: true,
        },
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.details.length > 0) {
        setFieldDetails(err.details);
        setError(err.message);
      } else {
        const message = err instanceof Error ? err.message : t("err.register.create");
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <main
          id="main"
          className="w-full max-w-sm rounded-2xl border border-border bg-surface/60 p-8 shadow-elegant backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20 mx-auto">
            <SprigIsotipo className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Cuenta creada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesion.
          </p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Iniciar sesion
          </button>
        </main>
      </div>
    );
  }

  const usernameError = fieldErrors(fieldDetails, "username");
  const emailError = fieldErrors(fieldDetails, "email");
  const passwordError = fieldErrors(fieldDetails, "password");

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-4">
      <main
        id="main"
        className="w-full max-w-3xl rounded-2xl border border-border bg-surface/60 p-6 md:p-8 shadow-elegant backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <div className="mb-4 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-glow">
            <SprigIsotipo className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registrate en Sprig</p>
        </div>

        <form
          onSubmit={handleSubmit}
          aria-busy={loading}
          className="grid gap-x-6 gap-y-3.5 md:grid-cols-2"
        >
          <div>
            <label htmlFor={ids.fullName} className={labelCls}>
              Nombre completo *
            </label>
            <input
              id={ids.fullName}
              type="text"
              autoComplete="name"
              aria-required="true"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls()}
              placeholder="Juan Perez Garcia"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor={ids.username} className={labelCls}>
              Usuario *
            </label>
            <input
              id={ids.username}
              type="text"
              autoComplete="username"
              aria-required="true"
              aria-invalid={!!usernameError}
              aria-describedby={usernameError ? `${ids.username}-err` : undefined}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls(!!usernameError)}
              placeholder="juan_perez"
              disabled={loading}
            />
            {usernameError && (
              <p id={`${ids.username}-err`} className="mt-1 text-xs text-destructive">
                {usernameError}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor={ids.email} className={labelCls}>
              Correo electronico *
            </label>
            <input
              id={ids.email}
              type="email"
              autoComplete="email"
              aria-required="true"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? `${ids.email}-err` : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls(!!emailError)}
              placeholder="juan@ejemplo.com"
              disabled={loading}
            />
            {emailError && (
              <p id={`${ids.email}-err`} className="mt-1 text-xs text-destructive">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.password} className={labelCls}>
              Contrasena *
            </label>
            <input
              id={ids.password}
              type="password"
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={!!passwordError}
              aria-describedby={`${ids.hints}${passwordError ? ` ${ids.password}-err` : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls(!!passwordError)}
              placeholder="Minimo 12 caracteres"
              disabled={loading}
            />
            <PasswordHints password={password} id={ids.hints} />
            {passwordError && (
              <p id={`${ids.password}-err`} className="mt-1 text-xs text-destructive">
                {passwordError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.confirm} className={labelCls}>
              Confirmar contrasena *
            </label>
            <input
              id={ids.confirm}
              type="password"
              autoComplete="new-password"
              aria-required="true"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls()}
              placeholder="Repite tu contrasena"
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-start gap-2.5">
              <input
                id={ids.consent}
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                aria-required="true"
                disabled={loading}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <label htmlFor={ids.consent} className="text-sm text-foreground">
                Soy mayor de 18 años, acepto los{" "}
                <a
                  href="/terminos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline"
                >
                  Términos y Condiciones
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>{" "}
                y autorizo el tratamiento de mis datos personales conforme a la{" "}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline"
                >
                  Política de Privacidad
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>
                . *
              </label>
            </div>
            <p className="mt-1.5 pl-[26px] text-xs text-muted-foreground">
              Solo pedimos los datos necesarios para crear tu cuenta. Puedes revocar tu autorización
              cuando quieras.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-destructive text-center font-medium md:col-span-2"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full md:col-span-2 items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="sr-only">Creando tu cuenta…</span>
              </>
            ) : (
              "Crear cuenta"
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Ya tienes cuenta?{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            Iniciar sesion
          </a>
        </p>
      </main>
    </div>
  );
}
