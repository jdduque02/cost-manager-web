import { useState } from "react";
import {
  FileCheck2,
  CalendarClock,
  BellOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  CheckCheck,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import type { NotificationPayload } from "@/lib/socket";
import type {
  StatementImport,
  StatementImportStatus,
  StatementImportFileStatus,
} from "@/lib/api/statement-imports";
import { useStatementImportJob, useStatementImports } from "@/lib/hooks/use-api";
import {
  resolveNotification,
  parseImportReference,
  formatRelativeTime,
  groupNotifications,
  type NotificationKind,
} from "./format";

const TERMINAL_STATUSES = new Set(["completed", "partial", "failed"]);

const KIND_META: Record<NotificationKind, { icon: LucideIcon; className: string }> = {
  import: { icon: FileCheck2, className: "bg-primary/10 text-primary" },
  reminder: { icon: CalendarClock, className: "bg-warning/10 text-warning" },
  system: { icon: BellOff, className: "bg-surface-2 text-muted-foreground" },
};

const STATUS_LABELS: Record<StatementImportStatus, string> = {
  pending: "En cola",
  processing: "Procesando",
  completed: "Carga completada",
  partial: "Carga completada con errores",
  failed: "No se pudo importar",
};

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

export function NotificationRow({
  notification,
  onSelect,
}: {
  notification: NotificationPayload;
  onSelect: (n: NotificationPayload) => void;
}) {
  const { kind, title, description } = resolveNotification(notification);
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const unread = !notification.is_read;

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left transition-colors",
        unread
          ? "border-primary/60 bg-primary/[0.06] hover:bg-primary/10"
          : "border-transparent hover:bg-surface",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          meta.className,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              unread ? "font-semibold text-foreground" : "font-medium text-foreground/90",
            )}
          >
            {title}
          </span>
          {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </span>
        {description && (
          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
        <span className="mt-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
          <span>{formatRelativeTime(notification.created_at)}</span>
          {kind === "import" && (
            <>
              <span aria-hidden className="text-muted-foreground/40">
                ·
              </span>
              <span className="flex items-center gap-0.5 font-medium text-primary">
                Ver resultado
                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}

export function NotificationGroupList({
  notifications,
  onSelect,
  className,
}: {
  notifications: NotificationPayload[];
  onSelect: (n: NotificationPayload) => void;
  className?: string;
}) {
  const groups = groupNotifications(notifications);
  if (groups.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((n) => (
              <NotificationRow key={n.id} notification={n} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "muted" | "destructive";
}) {
  const colors: Record<string, string> = {
    success: "text-success",
    muted: "text-foreground",
    destructive: "text-destructive",
  };
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5 text-center">
      <p className={cn("text-lg font-semibold tabular-nums", colors[tone])}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function ImportResultSummary({ job }: { job: StatementImport }) {
  const { status } = job;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl bg-surface p-4">
        {status === "completed" ? (
          <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
        ) : status === "failed" ? (
          <XCircle className="h-8 w-8 shrink-0 text-destructive" />
        ) : status === "partial" ? (
          <AlertTriangle className="h-8 w-8 shrink-0 text-warning" />
        ) : (
          <Loader2 className="h-8 w-8 shrink-0 animate-spin text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</p>
          <p className="text-xs text-muted-foreground">
            {job.processed_files} de {job.total_files} archivos · {job.total_records_parsed}{" "}
            movimientos detectados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Registradas" value={job.total_records_created} tone="success" />
        <StatCard label="Omitidas" value={job.total_records_skipped} tone="muted" />
        <StatCard label="Con error" value={job.total_records_failed} tone="destructive" />
      </div>

      {job.files && job.files.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Archivos
          </p>
          {job.files.map((f) => (
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
              {(f.records_parsed > 0 || f.records_created > 0 || f.records_skipped > 0) && (
                <p className="mt-0.5 text-muted-foreground">
                  {f.records_parsed} detectados · {f.records_created} creados · {f.records_skipped}{" "}
                  omitidos
                </p>
              )}
              {f.status === "failed" && f.error_message && (
                <p className="mt-1 text-destructive">{f.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImportResultContent({
  notification,
  refInfo,
  fallback,
}: {
  notification: NotificationPayload;
  refInfo: { jobId?: number; timestamp?: number } | null;
  fallback: string | null;
}) {
  const exactQuery = useStatementImportJob(refInfo?.jobId ?? null);
  const recentQuery = useStatementImports();

  let job: StatementImport | undefined = exactQuery.data;
  if (!job) {
    const target = new Date(notification.created_at).getTime();
    job = (recentQuery.data ?? [])
      .slice()
      .sort(
        (a, b) =>
          Math.abs(new Date(a.created_at).getTime() - target) -
          Math.abs(new Date(b.created_at).getTime() - target),
      )[0];
  }

  if (exactQuery.isLoading || recentQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando resultado de la importación…
      </div>
    );
  }

  if (job) return <ImportResultSummary job={job} />;

  if (exactQuery.isError || recentQuery.isError) {
    return (
      <div className="rounded-xl bg-destructive/5 px-4 py-6 text-center text-xs text-destructive">
        No se pudo consultar el resultado de la carga. Inténtalo de nuevo.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface px-4 py-6 text-center text-xs text-muted-foreground">
      {fallback ??
        "La carga finalizó. Revisa la sección de transacciones para ver los movimientos."}
    </div>
  );
}

export function NotificationDetailDialog({
  notification,
  onClose,
}: {
  notification: NotificationPayload;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  const { kind, title, description } = resolveNotification(notification);
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const refInfo = parseImportReference(notification.reference);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 pr-6">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                meta.className,
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="text-xs">
                {new Date(notification.created_at).toLocaleString("es-CO", {
                  day: "2-digit",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {kind === "import" ? (
          <ImportResultContent
            notification={notification}
            refInfo={refInfo}
            fallback={description}
          />
        ) : (
          <div className="rounded-xl bg-surface px-4 py-4 text-sm leading-relaxed text-muted-foreground">
            {description ?? "Sin detalles adicionales."}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function NotificationsDialog({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onSelect,
  onMarkAllRead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NotificationPayload[];
  unreadCount: number;
  onSelect: (n: NotificationPayload) => void;
  onMarkAllRead: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="text-left">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base">Notificaciones</DialogTitle>
              {unreadCount > 0 && <Badge tone="primary">{unreadCount} sin leer</Badge>}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllRead}
                className="h-7 gap-1 px-2 text-xs text-primary"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </Button>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="px-1 pb-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-xs text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-40" />
                Sin notificaciones
              </div>
            ) : (
              <NotificationGroupList notifications={notifications} onSelect={onSelect} />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
