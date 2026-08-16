import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { SprigIsotipo } from "@/components/brand/sprig-isotipo";
import { authApi } from "@/lib/api/auth";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor ingresa tu correo electrónico");
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
      setError("No se pudo enviar el código. Verifica tu correo e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/60 p-8 shadow-elegant backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
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
          <div className="space-y-4 text-center">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary"
                placeholder="tu@correo.com"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código"}
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
      </div>
    </div>
  );
}
