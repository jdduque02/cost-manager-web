import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Check, X } from "lucide-react";
import { SprigIsotipo } from "@/components/brand/sprig-isotipo";
import { api, ApiError } from "@/lib/api/client";
import type { ValidationErrorDetail } from "@/lib/api/client";

interface CreateUserResponse {
  id: string;
  external_id: string;
  username: string;
  email: string;
}

const PASSWORD_RULES = [
  { key: "minLength", test: (p: string) => p.length >= 8, label: "Minimo 8 caracteres" },
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

function PasswordHints({ password }: { password: string }) {
  return (
    <ul className="mt-1.5 space-y-0.5">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.key} className="flex items-center gap-1.5 text-xs">
            {ok ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground/50" />
            )}
            <span className={ok ? "text-success" : "text-muted-foreground"}>{rule.label}</span>
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

export function Register() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setError("Por favor completa todos los campos obligatorios");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }
    if (!passwordValid) {
      setError("La contrasena no cumple con los requisitos");
      return;
    }

    setLoading(true);
    setError("");
    setFieldDetails([]);

    try {
      await api.post<CreateUserResponse>("user", {
        username,
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
        address: address || undefined,
        document_id: documentId || undefined,
        locale: "es",
        timezone: `${username}_${new Date().getFullYear()}`,
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
        const message = err instanceof Error ? err.message : "Error al crear la cuenta";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/60 p-8 shadow-elegant backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20 mx-auto">
            <SprigIsotipo className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Cuenta creada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesion.
          </p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            Iniciar sesion
          </button>
        </div>
      </div>
    );
  }

  const usernameError = fieldErrors(fieldDetails, "username");
  const emailError = fieldErrors(fieldDetails, "email");
  const passwordError = fieldErrors(fieldDetails, "password");
  const phoneError = fieldErrors(fieldDetails, "phone");

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/60 p-8 shadow-elegant backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-glow">
            <SprigIsotipo className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registrate en Sprig</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nombre completo *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              placeholder="Juan Perez Garcia"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Usuario *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary ${
                usernameError ? "border-destructive" : "border-border"
              }`}
              placeholder="juan_perez"
              disabled={loading}
            />
            {usernameError && <p className="mt-1 text-xs text-destructive">{usernameError}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Correo electronico *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary ${
                emailError ? "border-destructive" : "border-border"
              }`}
              placeholder="juan@ejemplo.com"
              disabled={loading}
            />
            {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Documento de identidad
            </label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              placeholder="1234567890"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Telefono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary ${
                phoneError ? "border-destructive" : "border-border"
              }`}
              placeholder="+57 310 123 4567"
              disabled={loading}
            />
            {phoneError && <p className="mt-1 text-xs text-destructive">{phoneError}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Direccion</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              placeholder="Cra 10 #5-20, Bogota"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Contrasena *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary ${
                passwordError ? "border-destructive" : "border-border"
              }`}
              placeholder="Minimo 8 caracteres"
              disabled={loading}
            />
            <PasswordHints password={password} />
            {passwordError && <p className="mt-1 text-xs text-destructive">{passwordError}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Confirmar contrasena *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              placeholder="Repite tu contrasena"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ya tienes cuenta?{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            Iniciar sesion
          </a>
        </p>
      </div>
    </div>
  );
}
