import { api, apiPostForm } from "./client";
import type { TransactionType } from "./finance";

export type StatementImportStatus = "pending" | "processing" | "completed" | "partial" | "failed";

export type StatementImportFileStatus = "pending" | "processing" | "success" | "failed";

interface StatementImportFile {
  id: number;
  import_id: number;
  filename: string;
  mimetype: string;
  size_bytes: number;
  status: StatementImportFileStatus;
  records_parsed: number;
  records_created: number;
  records_skipped: number;
  records_uncategorized: number;
  error_code: string | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface StatementImport {
  id: number;
  user_id: number;
  status: StatementImportStatus;
  total_files: number;
  processed_files: number;
  success_files: number;
  failed_files: number;
  total_records_parsed: number;
  total_records_created: number;
  total_records_skipped: number;
  total_records_failed: number;
  total_records_uncategorized: number;
  options: Record<string, unknown>;
  error: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  files?: StatementImportFile[];
}

/** Payload emitido por el backend por WebSocket (`statement-import:progress`). */
export interface StatementImportProgress {
  id: number;
  status: StatementImportStatus;
  total_files: number;
  processed_files: number;
  success_files: number;
  failed_files: number;
  total_records_parsed: number;
  total_records_created: number;
  total_records_skipped: number;
  total_records_failed: number;
  total_records_uncategorized: number;
  files: Array<{
    id: number;
    filename: string;
    status: StatementImportFileStatus;
    records_parsed: number;
    records_created: number;
    records_skipped: number;
    records_uncategorized: number;
    error_code: string | null;
    error_message: string | null;
  }>;
  created_at: string;
  updated_at: string | null;
}

interface CreateStatementImportForm {
  password?: string;
  default_category_id?: number;
  account_id?: number;
  skip_duplicates?: boolean;
  assign_categories?: boolean;
  default_type?: TransactionType;
}

export const statementImportApi = {
  create: async (userId: string, formData: FormData): Promise<StatementImport> => {
    const result = await apiPostForm<StatementImport[]>(
      `users/${userId}/statement-imports`,
      formData,
    );
    return Array.isArray(result) ? result[0] : result;
  },
  list: (userId: string, page = 1, limit = 10) =>
    api.get<StatementImport[]>(`users/${userId}/statement-imports?page=${page}&limit=${limit}`),
  get: (userId: string, id: number) =>
    api.getOne<StatementImport>(`users/${userId}/statement-imports/${id}`),
  retry: (userId: string, id: number, password?: string) =>
    api.post<StatementImport>(`users/${userId}/statement-imports/${id}/retry`, { password }),
};
