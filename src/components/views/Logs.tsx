import { useState, type ReactNode } from "react";
import { Card, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logsApi } from "@/lib/api/logs";
import type { LogSeverity, LogSource } from "@/lib/api/logs";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";

const severityConfig: Record<
  LogSeverity,
  { tone: "muted" | "warning" | "destructive"; icon: typeof Info; label: string }
> = {
  INFO: { tone: "muted", icon: Info, label: "INFO" },
  WARN: { tone: "warning", icon: AlertTriangle, label: "WARN" },
  ERROR: { tone: "destructive", icon: AlertCircle, label: "ERROR" },
  DEBUG: { tone: "muted", icon: Bug, label: "DEBUG" },
};

export function Logs() {
  const [severity, setSeverity] = useState<LogSeverity | "all">("all");
  const [source, setSource] = useState<LogSource>("all");
  const [search, setSearch] = useState("");
  const [context, setContext] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "logs", "stats"],
    queryFn: () => logsApi.getStats(),
    staleTime: 30_000,
  });

  const {
    data: logsResult,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin", "logs", { severity, source, search, context, page }],
    queryFn: () =>
      logsApi.getLogs({
        severity: severity === "all" ? undefined : severity,
        source,
        search: search || undefined,
        context: context || undefined,
        page,
        limit: 25,
        sortBy: "timestamp",
        sortOrder: "DESC",
      }),
    staleTime: 15_000,
  });

  const logs = logsResult?.data ?? [];
  const total = logsResult?.total ?? 0;
  const totalPages = Math.ceil(total / 25) || 1;

  const clearFilters = () => {
    setSeverity("all");
    setSource("all");
    setSearch("");
    setContext("");
    setPage(1);
  };

  const hasFilters = severity !== "all" || source !== "all" || search || context;

  let statsSection: ReactNode = null;
  if (stats) {
    statsSection = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total", value: stats.total, tone: "muted" as const },
          { label: "INFO", value: stats.info, tone: "muted" as const },
          { label: "WARN", value: stats.warn, tone: "warning" as const },
          { label: "ERROR", value: stats.error, tone: "destructive" as const },
          { label: "DEBUG", value: stats.debug, tone: "muted" as const },
        ].map((stat) => (
          <Card key={stat.label} className="p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className="mt-1 text-2xl font-display font-semibold">{stat.value.toLocaleString()}</p>
          </Card>
        ))}
      </div>
    );
  } else if (statsLoading) {
    statsSection = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key -- static skeleton cards never reorder
          <Card key={`skeleton-${i}`} className="p-3">
            <div className="h-3 w-12 rounded bg-surface-2" />
            <div className="mt-2 h-7 w-10 rounded bg-surface-2" />
          </Card>
        ))}
      </div>
    );
  }

  let logsContent: ReactNode;
  if (isLoading) {
    logsContent = (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  } else if (logs.length === 0) {
    logsContent = (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No se encontraron logs con los filtros seleccionados.
      </div>
    );
  } else {
    logsContent = (
      <div className="space-y-1">
        {logs.map((log) => {
          const config = severityConfig[log.severity] ?? severityConfig.INFO;
          const SevIcon = config.icon;
          const isExpanded = expandedId === log.id;

          return (
            <div key={log.id} className="border-b border-border last:border-0">
              <button
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-surface/60 rounded-lg"
              >
                <div className="mt-0.5 flex-shrink-0">
                  <SevIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={config.tone} className="text-[10px] px-1.5 py-0">
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{log.source}</span>
                    {log.context && (
                      <span className="text-xs font-mono text-muted-foreground">· {log.context}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed truncate">{log.message}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {new Date(log.timestamp).toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </button>
              {isExpanded && log.data && Object.keys(log.data).length > 0 && (
                <div className="mx-3 mb-3 rounded-lg bg-surface-2 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    Datos del log
                  </p>
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all overflow-auto max-h-48">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Sistema</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Logs del sistema
          </h1>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-surface hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          Actualizar
        </button>
      </div>

      {/* Stats cards */}
      {statsSection}

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Filtros</h3>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Severidad</Label>
            <Select
              value={severity}
              onValueChange={(v) => {
                setSeverity(v as LogSeverity | "all");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="WARN">WARN</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
                <SelectItem value="DEBUG">DEBUG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fuente</Label>
            <Select
              value={source}
              onValueChange={(v) => {
                setSource(v as LogSource);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="app">App</SelectItem>
                <SelectItem value="audit">Auditoría</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Mensaje o contexto..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contexto / Módulo</Label>
            <Input
              value={context}
              onChange={(e) => {
                setContext(e.target.value);
                setPage(1);
              }}
              placeholder="Ej. AuthModule"
            />
          </div>
        </div>
      </Card>

      {/* Log entries */}
      <Card>
        {logsContent}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Página {page} de {totalPages} · {total.toLocaleString()} resultados
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
