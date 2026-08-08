import { useEffect, useState } from "react";
import { FileUp, Loader2, Lock, CheckCircle2, XCircle, FolderOpen, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCategories,
  useBankAccounts,
  useStatementImports,
  useCreateStatementImport,
  useRetryStatementImport,
  useStatementImportProgress,
  useStatementImportJob,
} from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";
import type {
  StatementImportProgress,
  StatementImportFileStatus,
  StatementImport,
} from "@/lib/api/statement-imports";
import type { TransactionType } from "@/lib/api/finance";

interface StatementImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TERMINAL_STATUSES = new Set(["completed", "partial", "failed"]);

function fileStatusLabel(status: StatementImportFileStatus): string {
  switch (status) {
    case "pending":
      return "En cola";
    case "processing":
      return "Procesando";
    case "success":
      return "Completado";
    case "failed":
      return "Error";
  }
}

function toProgress(job: StatementImport): StatementImportProgress {
  return {
    id: job.id,
    status: job.status,
    total_files: job.total_files,
    processed_files: job.processed_files,
    success_files: job.success_files,
    failed_files: job.failed_files,
    total_records_parsed: job.total_records_parsed,
    total_records_created: job.total_records_created,
    total_records_skipped: job.total_records_skipped,
    total_records_failed: job.total_records_failed,
    total_records_uncategorized: job.total_records_uncategorized ?? 0,
    files: (job.files ?? []).map((f) => ({
      id: f.id,
      filename: f.filename,
      status: f.status,
      records_parsed: f.records_parsed,
      records_created: f.records_created,
      records_skipped: f.records_skipped,
      records_uncategorized: f.records_uncategorized ?? 0,
      error_code: f.error_code,
      error_message: f.error_message,
    })),
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}

export function StatementImportDialog({ open, onOpenChange }: StatementImportDialogProps) {
  const { data: categories = [] } = useCategories();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: recentImports = [] } = useStatementImports();

  const createImport = useCreateStatementImport();
  const retryImport = useRetryStatementImport();

  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [assignCategories, setAssignCategories] = useState(true);
  const [defaultType, setDefaultType] = useState<TransactionType>("expense");
  const [progress, setProgress] = useState<StatementImportProgress | null>(null);
  const [activeImportId, setActiveImportId] = useState<number | null>(null);

  // Polling de respaldo: si los eventos de WebSocket se pierden (socket caído,
  // token vencido), el estado del lote se sincroniza vía HTTP hasta el terminal.
  const { data: polledJob } = useStatementImportJob(activeImportId);

  useStatementImportProgress((payload) => {
    if (activeImportId !== null && payload.id === activeImportId) {
      setProgress(payload);
    }
  });

  useEffect(() => {
    if (polledJob) setProgress(toProgress(polledJob));
  }, [polledJob]);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setPassword("");
      setCategoryId("");
      setAccountId("");
      setSkipDuplicates(true);
      setAssignCategories(true);
      setDefaultType("expense");
      setProgress(null);
      setActiveImportId(null);
    }
  }, [open]);

  const isUploading = createImport.isPending;
  const isRunning = !!progress && !TERMINAL_STATUSES.has(progress.status) && !isUploading;
  const isDone = !!progress && TERMINAL_STATUSES.has(progress.status);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f, f.name));
    if (password) formData.append("password", password);
    if (categoryId) formData.append("default_category_id", categoryId);
    if (accountId) formData.append("account_id", accountId);
    formData.append("skip_duplicates", skipDuplicates ? "true" : "false");
    formData.append("assign_categories", assignCategories ? "true" : "false");
    formData.append("default_type", defaultType);

    try {
      const job = await createImport.mutateAsync(formData);
      setActiveImportId(job.id);
      setProgress(toProgress(job));
      toast.success(
        `Carga creada: ${job.total_files} archivo(s) en cola. Te avisaremos al terminar.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear la carga");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar extracto bancario</DialogTitle>
          <DialogDescription>
            Carga uno o varios PDFs de tus extractos. Se procesan en segundo plano y te avisamos por
            cada archivo si tuvo éxito o error.
          </DialogDescription>
        </DialogHeader>

        {isRunning || isDone ? (
          <ImportProgress
            progress={progress}
            onRetry={() => {
              if (progress) {
                retryImport.mutate(
                  { id: progress.id, password: password || undefined },
                  {
                    onSuccess: (job) => {
                      setProgress(toProgress(job));
                      toast.success("Reintento iniciado. Te avisaremos al terminar.");
                    },
                    onError: (error) => {
                      toast.error(
                        error instanceof Error ? error.message : "Error al reintentar",
                      );
                    },
                  },
                );
              }
            }}
            isRetrying={retryImport.isPending}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Archivos PDF</Label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface px-4 py-8 text-center transition hover:border-primary/50">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Selecciona tus extractos
                </span>
                <span className="text-xs text-muted-foreground">
                  Máx. 10 archivos · 15 MB c/u · PDF
                </span>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    setFiles(selected.slice(0, 10));
                    e.target.value = "";
                  }}
                />
              </label>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs"
                    >
                      <span className="truncate font-medium">{f.name}</span>
                      <span className="ml-2 shrink-0 text-muted-foreground tabular-nums">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {categories.length === 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-surface p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Sin categorías configuradas</p>
                  <p className="text-xs text-muted-foreground">
                    Debes crear categorías antes de importar transacciones.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Categoría por defecto</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="General (por defecto)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se aplica a todos los movimientos que no se puedan clasificar.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Tipo por defecto</Label>
                <Select
                  value={defaultType}
                  onValueChange={(v) => setDefaultType(v as TransactionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Para movimientos ambiguos del extracto.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Cuenta bancaria (opcional)</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.bank_name} · {a.masked_account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Al elegirla, los saldos se ajustan con los movimientos.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Contraseña del PDF
                </Label>
                <Input
                  type="password"
                  placeholder="Solo si el PDF está protegido"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">No se almacena en la base de datos.</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-surface p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Omitir duplicados</p>
                <p className="text-xs text-muted-foreground">
                  Salta movimientos con misma fecha, monto y descripción.
                </p>
              </div>
              <Checkbox
                checked={skipDuplicates}
                onCheckedChange={(v) => setSkipDuplicates(v === true)}
                aria-label="Omitir duplicados"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-surface p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-categorizar movimientos</p>
                <p className="text-xs text-muted-foreground">
                  Asigna categorías usando las reglas aprendidas por comercio. Lo que no matchee
                  quedará por editar.
                </p>
              </div>
              <Checkbox
                checked={assignCategories}
                onCheckedChange={(v) => setAssignCategories(v === true)}
                aria-label="Auto-categorizar movimientos"
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={files.length === 0 || isUploading || categories.length === 0}
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                Importar
              </Button>
            </DialogFooter>
          </form>
        )}

        {recentImports.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cargas recientes
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {recentImports.slice(0, 6).map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {job.status === "completed" || job.status === "partial" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : job.status === "failed" ? (
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    <span className="capitalize">{job.status}</span>
                    <span className="text-muted-foreground">
                      {job.total_records_created} creados · {job.total_records_skipped} omitidos
                      {job.total_records_uncategorized ? (
                        <>
                          {" "}
                          ·{" "}
                          <span className="text-warning">
                            {job.total_records_uncategorized} por editar
                          </span>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(job.created_at).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ImportProgress({
  progress,
  onRetry,
  isRetrying,
}: {
  progress: StatementImportProgress;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const isDone = TERMINAL_STATUSES.has(progress.status);
  const hasFailed = progress.failed_files > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-surface p-4">
        {isDone ? (
          progress.failed_files === 0 ? (
            <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
          ) : progress.success_files === 0 ? (
            <XCircle className="h-8 w-8 shrink-0 text-destructive" />
          ) : (
            <CheckCircle2 className="h-8 w-8 shrink-0 text-warning" />
          )
        ) : (
          <Loader2 className="h-8 w-8 shrink-0 animate-spin text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isDone
              ? progress.failed_files === 0
                ? "Carga completada"
                : progress.success_files === 0
                  ? "No se pudo importar"
                  : "Carga completada con errores"
              : "Procesando extractos…"}
          </p>
          <p className="text-xs text-muted-foreground">
            {progress.processed_files} de {progress.total_files} archivos ·{" "}
            {progress.total_records_created} transacciones registradas ·{" "}
            {progress.total_records_skipped} omitidas
            {progress.total_records_uncategorized ? (
              <>
                {" "}
                ·{" "}
                <span className="text-warning">
                  {progress.total_records_uncategorized} por editar
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {isDone && hasFailed && (
        <Button
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
          className="w-full"
        >
          {isRetrying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-4 w-4" />
          )}
          Reintentar archivos fallidos
        </Button>
      )}

      <div className="space-y-1.5">
        {progress.files.map((f) => (
          <div key={f.id} className="rounded-lg bg-surface px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{f.filename}</span>
              <Badge
                tone={
                  f.status === "success"
                    ? "success"
                    : f.status === "failed"
                      ? "destructive"
                      : f.status === "processing"
                        ? "primary"
                        : "muted"
                }
                className="shrink-0"
              >
                {fileStatusLabel(f.status)}
              </Badge>
            </div>
            {(f.records_parsed > 0 || f.records_skipped > 0 || f.records_created > 0) && (
              <p className="mt-0.5 text-muted-foreground">
                {f.records_parsed} detectados · {f.records_created} creados · {f.records_skipped}{" "}
                omitidos
                {f.records_uncategorized ? (
                  <>
                    {" "}
                    · <span className="text-warning">{f.records_uncategorized} por editar</span>
                  </>
                ) : null}
              </p>
            )}
            {f.status === "failed" && f.error_message && (
              <p className={cn("mt-1 text-destructive")}>{f.error_message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
