import { useId, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { identityApi } from "@/lib/api/identity";
import { LEGAL_VERSION } from "@/content/legal";
import { t, translateApiMessage } from "@/lib/i18n/errors";

const linkCls = "font-medium text-primary underline";

function LegalLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkCls}>
      {label}
      <span className="sr-only">{t("ui.consent.newTab")}</span>
    </a>
  );
}

/**
 * Re-consentimiento bloqueante: se muestra mientras `user.terms_version` no sea la
 * versión legal vigente. Sin `onOpenChange`, Escape y clic fuera no lo cierran.
 */
export function ConsentDialog() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const checkId = useId();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.terms_version === LEGAL_VERSION) return null;

  const handleAccept = async (e: React.MouseEvent) => {
    e.preventDefault(); // no dejar que Radix cierre el diálogo: lo cierra el usuario devuelto por el API
    setSaving(true);
    setError(null);
    try {
      const updated = await identityApi.acceptTerms(user.id, LEGAL_VERSION);
      if (!updated) throw new Error("acceptTerms sin usuario en la respuesta");
      updateUser(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? translateApiMessage(err.message, err.status)
          : t("err.consent.save"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("ui.consent.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("ui.consent.desc").replace("{version}", LEGAL_VERSION)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-start gap-2.5">
          <input
            id={checkId}
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            aria-required="true"
            disabled={saving}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <label htmlFor={checkId} className="text-sm text-foreground">
            {t("ui.consent.check.pre")} <LegalLink href="/terminos" label={t("ui.consent.terms")} />
            {t("ui.consent.check.mid1")}{" "}
            <LegalLink href="/privacidad" label={t("ui.consent.privacy")} />{" "}
            {t("ui.consent.check.mid2")}{" "}
            <LegalLink href="/cookies" label={t("ui.consent.cookies")} />.
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("ui.consent.version").replace("{version}", LEGAL_VERSION)}
        </p>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDecline} disabled={saving}>
            {t("ui.consent.decline")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleAccept} disabled={!accepted || saving}>
            {saving ? t("ui.consent.saving") : t("ui.consent.accept")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
