import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, CircleDollarSign } from "lucide-react";

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Por favor ingresa el usuario y contraseña");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(username, password);
    } catch (err) {
      console.log(err);
      setError("Credenciales inválidas o error del servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/60 p-8 shadow-elegant backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <CircleDollarSign className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresa a tu cuenta de Cost Manager</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Usuario / Correo</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              placeholder="juan_perez"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-foreground">
              Contraseña
              <a href="#" className="text-xs text-primary hover:underline">¿Olvidaste?</a>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta? <a href="#" className="font-medium text-primary hover:underline">Solicita acceso</a>
        </p>
      </div>
    </div>
  );
}
