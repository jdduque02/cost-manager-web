import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { SprigIsotipo } from "@/components/brand/sprig-isotipo";

import { t } from "@/lib/i18n/errors";
export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t("err.login.empty"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(username, password);
    } catch (err) {
      console.log(err);
      setError(t("err.login.failed"));
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
            Bienvenido de nuevo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresa a tu cuenta de Sprig</p>
        </div>

        <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
          <div>
            <label
              htmlFor="login-username"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Usuario / Correo
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="juan_perez"
              disabled={loading}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
              disabled={loading}
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
                <span className="sr-only">Iniciando sesión…</span>
              </>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No tienes cuenta?{" "}
          <a href="/register" className="font-medium text-primary hover:underline">
            Registrate aqui
          </a>
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <a href="/privacidad" className="underline">
            Privacidad
          </a>
          {" · "}
          <a href="/terminos" className="underline">
            Términos
          </a>
          {" · "}
          <a href="/cookies" className="underline">
            Cookies
          </a>
        </p>
      </main>
    </div>
  );
}
