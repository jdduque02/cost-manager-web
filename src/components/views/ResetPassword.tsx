import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2, CircleDollarSign, CheckCircle, ArrowLeft, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api/auth";

export function ResetPassword() {
  const navigate = useNavigate();
  const { email } = useSearch({ from: "/reset-password" });

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"otp" | "password">("otp");
  const [resetToken, setResetToken] = useState("");
  const [success, setSuccess] = useState(false);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError("Ingresa el código de 6 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await authApi.verifyOtp(email, code);
      const r = Array.isArray(result) ? result[0] : result;
      setResetToken(r.reset_token);
      setStep("password");
    } catch (err) {
      console.error(err);
      setError("Código inválido o expirado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setError("Ingresa la nueva contraseña");
      return;
    }
    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authApi.resetPassword(email, resetToken, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 2500);
    } catch (err) {
      console.error(err);
      setError("No se pudo restablecer la contraseña. Intenta de nuevo.");
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
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            {step === "otp" ? "Verificar código" : "Nueva contraseña"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {step === "otp"
              ? `Código enviado a ${email}`
              : "Ingresa tu nueva contraseña"}
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm text-foreground font-medium">
              Contraseña restablecida correctamente
            </p>
            <p className="text-xs text-muted-foreground">
              Redirigiendo al inicio de sesión...
            </p>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : step === "otp" ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Código de verificación
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(val);
                }}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-center text-lg tracking-[0.5em] font-mono outline-none transition focus:border-primary"
                placeholder="000000"
                maxLength={6}
                disabled={loading}
                autoFocus
              />
              <p className="mt-1.5 text-xs text-muted-foreground text-center">
                El código expira en 10 minutos
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Nueva contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-primary"
                  placeholder="Mínimo 8 caracteres"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Confirmar contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-primary"
                  placeholder="Repite la contraseña"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Restablecer contraseña"
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
      </div>
    </div>
  );
}
