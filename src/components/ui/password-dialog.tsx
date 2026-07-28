import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => void;
  mode: "encrypt" | "decrypt";
  loading?: boolean;
}

export function PasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  mode,
  loading,
}: PasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    onSubmit(password.trim());
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setPassword("");
      setShowPassword(false);
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {mode === "encrypt" ? "Cifrar datos financieros" : "Descifrar datos"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === "encrypt"
              ? "Establece una contraseña para cifrar la información financiera sensible. Los datos se cifrarán localmente antes de enviarse al servidor."
              : "Ingresa la contraseña para ver la información financiera."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="enc-password">
              {mode === "encrypt" ? "Contraseña de cifrado" : "Contraseña"}
            </Label>
            <div className="relative">
              <Input
                id="enc-password"
                type={showPassword ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === "encrypt" && (
            <div className="rounded-lg bg-surface p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">¿Cómo funciona?</p>
              <ul className="mt-1.5 space-y-1">
                <li>• La contraseña se usa para cifrar los montos financieros con AES-256-GCM.</li>
                <li>• La contraseña nunca se almacena permanentemente.</li>
                <li>• Si olvidas la contraseña, los datos cifrados no se podrán descifrar.</li>
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!password.trim() || loading}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "encrypt" ? "Cifrar" : "Descifrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
