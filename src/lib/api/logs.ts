import { api } from "./client";

export type LogSeverity = "INFO" | "WARN" | "ERROR" | "DEBUG";
export type LogSource = "app" | "audit" | "all";

export interface LogEntry {
  id: string;
  severity: LogSeverity;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  source: string;
  timestamp: string;
}

export interface LogStats {
  total: number;
  info: number;
  warn: number;
  error: number;
  debug: number;
  oldestEntry?: string;
  newestEntry?: string;
}

export interface LogQuery {
  severity?: LogSeverity;
  source?: LogSource;
  search?: string;
  context?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "timestamp" | "severity";
  sortOrder?: "ASC" | "DESC";
}

export interface LogListResult {
  data: LogEntry[];
  total: number;
  timestamp: string;
}

export const logsApi = {
  async getLogs(query: LogQuery = {}): Promise<LogListResult> {
    const { source = "all", ...rest } = query;
    const params = new URLSearchParams();
    params.set("source", source);
    if (rest.severity) params.set("severity", rest.severity);
    if (rest.search) params.set("search", rest.search);
    if (rest.context) params.set("context", rest.context);
    if (rest.startDate) params.set("startDate", rest.startDate);
    if (rest.endDate) params.set("endDate", rest.endDate);
    if (rest.page) params.set("page", String(rest.page));
    if (rest.limit) params.set("limit", String(rest.limit));
    if (rest.sortBy) params.set("sortBy", rest.sortBy);
    if (rest.sortOrder) params.set("sortOrder", rest.sortOrder);
    const qs = params.toString();
    const endpoint = qs ? `admin/logs?${qs}` : "admin/logs";
    const entries = await api.get<LogEntry[]>(endpoint);
    const list = Array.isArray(entries) ? entries : [];
    return {
      data: list,
      total: list.length,
      timestamp: new Date().toISOString(),
    };
  },

  async getStats(): Promise<LogStats> {
    const result = await api.get<LogStats>(`admin/logs/stats`);
    const unwrapped = Array.isArray(result) ? result[0] : result;
    return {
      total: unwrapped.total ?? 0,
      info: unwrapped.info ?? 0,
      warn: unwrapped.warn ?? 0,
      error: unwrapped.error ?? 0,
      debug: unwrapped.debug ?? 0,
      oldestEntry: unwrapped.oldestEntry,
      newestEntry: unwrapped.newestEntry,
    };
  },

  getRealtime: () => api.get<LogEntry[]>("admin/logs/realtime"),
};
