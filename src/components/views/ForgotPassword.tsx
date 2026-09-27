import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { SprigIsotipo } from "@/components/brand/sprig-isotipo";
import { authApi } from "@/lib/api/auth";

import { t } from "@/lib/i18n/errors";
export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t("err.forgot.email"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authApi.forgotPassword(email);
      setSent(true);
      setTimeout(() => {
        navigate({ to: "/reset-password", search: { email } });
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(t("err.forgot.send"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <main
        id="main"
        className="w-full max-w-sm rounded-2xl border border-border bg-surface/60 p-8 shadow-elegant backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-glow">
            <SprigIsotipo className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Ingresa tu correo y te enviaremos un código de verificación
          </p>
        </div>

        {sent ? (
          <div role="status" className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Mail className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm text-foreground">
              Código enviado a <span className="font-medium">{email}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Redirigiendo al formulario de verificación...
            </p>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
            <div>
              <label
                htmlFor="forgot-email"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Correo electrónico
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="tu@correo.com"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive text-center font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Enviando código…</span>
                </>
              ) : (
                "Enviar código"
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            Volver al inicio de sesión
          </Link>
        </p>
      </main>
    </div>
  );
}
