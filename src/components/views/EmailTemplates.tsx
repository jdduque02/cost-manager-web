import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { EmailEditor, type EmailEditorRef } from "@react-email/editor";
import { Inspector } from "@react-email/editor/ui";
import "@react-email/editor/themes/default.css";
import { Card, Badge } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mailApi, OTP_EMAIL_TEMPLATE_KEY, type EmailTemplate } from "@/lib/api/mail";
import { Save, Eye, PenLine, Loader2, Mail, ArrowLeft, FileCode2 } from "lucide-react";

type Mode = "edit" | "preview";

export function EmailTemplates() {
  const editorRef = useRef<EmailEditorRef>(null);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<Mode>("edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    mailApi
      .getTemplate(OTP_EMAIL_TEMPLATE_KEY)
      .then((t) => {
        if (!active) return;
        setTemplate(t);
        setSubject(t.subject);
        setPreviewHtml(t.html_body);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la plantilla.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshPreview = useCallback(async () => {
    if (!editorRef.current) return;
    try {
      const html = await editorRef.current.getEmailHTML();
      setPreviewHtml(html);
    } catch {
      // El editor aún no está listo; se ignora.
    }
  }, []);

  const handleMode = async (next: Mode) => {
    if (next === "preview") {
      await refreshPreview();
    }
    setMode(next);
  };

  const handleSave = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      const html = await editorRef.current.getEmailHTML();
      const saved = await mailApi.updateTemplate(OTP_EMAIL_TEMPLATE_KEY, {
        subject: subject.trim() || "Tu código de recuperación de contraseña",
        html_body: html,
      });
      setTemplate(saved);
      setPreviewHtml(saved.html_body);
      toast.success("Plantilla guardada correctamente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <Mail className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
        >
          Reintentar
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Personalización de correos</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Plantillas de email</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edita el correo de recuperación de contraseña (OTP). Los cambios se guardan en{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">mail.email_template</code>.
          </p>
        </div>
        <Badge tone={template?.is_default ? "muted" : "success"}>
          {template?.is_default ? "Plantilla por defecto" : "Personalizada"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[260px] flex-1 sm:max-w-md">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Asunto del correo
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Tu código de recuperación de contraseña"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleMode(mode === "edit" ? "preview" : "edit")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out",
              mode === "preview"
                ? "bg-surface-2 text-foreground"
                : "border border-border text-muted-foreground hover:bg-surface hover:text-foreground",
            )}
          >
            {mode === "preview" ? (
              <>
                <PenLine className="h-4 w-4" /> Editar
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> Vista previa
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-150 ease-out hover:opacity-90 disabled:opacity-70"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Guardar
              </>
            )}
          </button>
        </div>
      </div>

      {mode === "preview" ? (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-border bg-surface/40 px-4 py-2.5">
            <ArrowLeft
              className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => handleMode("edit")}
            />
            <FileCode2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Vista previa · el código se reemplaza al enviar
            </span>
          </div>
          <div className="h-[680px]">
            <iframe
              title="Vista previa de la plantilla de correo"
              srcDoc={previewHtml}
              className="h-full w-full bg-white"
            />
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-border bg-surface/40 px-4 py-2.5">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Usa &ldquo;/&rdquo; para insertar bloques y haz clic en cualquier elemento para
              editarlo en el inspector.
            </span>
          </div>
          <EmailEditor
            ref={editorRef}
            content={template?.html_body ?? ""}
            className="flex h-[680px] overflow-hidden"
          >
            <Inspector.Root className="h-full w-80 shrink-0 overflow-y-auto border-l border-border bg-background/60 p-4">
              <div className="flex h-full flex-col gap-4">
                <Inspector.Breadcrumb>
                  {(segments) => (
                    <nav className="flex flex-wrap items-center gap-1 text-xs">
                      {segments.map((segment, index) => (
                        <span
                          key={segment.node.nodeType + index}
                          className="flex items-center gap-1"
                        >
                          {index > 0 && <span className="text-muted-foreground">/</span>}
                          <button
                            onClick={segment.focus}
                            className="rounded bg-surface-2 px-1.5 py-0.5 font-medium text-muted-foreground capitalize transition hover:bg-surface hover:text-foreground"
                          >
                            {segment.node.nodeType}
                          </button>
                        </span>
                      ))}
                    </nav>
                  )}
                </Inspector.Breadcrumb>

                <Inspector.Document>
                  {({ styles, setGlobalStyle, findStyleValue }) => (
                    <section className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Documento
                      </p>
                      {styles.map((group) => (
                        <div key={group.title} className="space-y-2">
                          <p className="text-sm font-medium text-foreground">{group.title}</p>
                          <div className="space-y-2">
                            {group.inputs.map((input) => {
                              const value = input.classReference
                                ? findStyleValue(input.classReference, input.prop)
                                : input.value;
                              return (
                                <label
                                  key={input.label}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span className="text-xs text-muted-foreground">
                                    {input.label}
                                  </span>
                                  <input
                                    type={input.type === "number" ? "number" : "color"}
                                    value={
                                      input.type === "number"
                                        ? String(value ?? "")
                                        : String(value ?? "#000000")
                                    }
                                    onChange={(e) =>
                                      input.classReference &&
                                      setGlobalStyle(
                                        input.classReference,
                                        input.prop,
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 w-16 cursor-pointer rounded-md border border-border bg-surface-2 px-1 text-xs text-foreground"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </section>
                  )}
                </Inspector.Document>

                <Inspector.Node>
                  {(ctx) => (
                    <section className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                        {ctx.nodeType}
                      </p>
                      <Inspector.Size {...ctx} />
                      <Inspector.Background {...ctx} />
                      <Inspector.Padding {...ctx} />
                      <Inspector.Border {...ctx} />
                      <Inspector.Typography {...ctx} />
                    </section>
                  )}
                </Inspector.Node>

                <Inspector.Text>
                  {(ctx) => (
                    <section className="space-y-4">
                      <Inspector.Typography {...ctx} />
                      <Inspector.Link {...ctx} />
                    </section>
                  )}
                </Inspector.Text>
              </div>
            </Inspector.Root>
          </EmailEditor>
        </Card>
      )}
    </div>
  );
}
