import type { NotificationPayload } from "@/lib/socket";

export type NotificationKind = "import" | "reminder" | "system";

/** Títulos de notificación enviados como clave i18n (builds antiguos). */
const TITLE_TRANSLATIONS: Record<string, string> = {
  "notification.IMPORT_COMPLETED_TITLE": "Carga de extractos finalizada",
};

/** Descripciones enviadas como clave i18n (builds antiguos). */
const DESCRIPTION_TRANSLATIONS: Record<string, string> = {
  "notification.IMPORT_COMPLETED_DESCRIPTION":
    "Se registraron {created} transacciones en {files} archivo(s). Archivos con error: {failed}.",
  "notification.UPCOMING_DESCRIPTION": "Tu {concept} de {amount} se efectuará el {date}.",
  "notification.PAYMENT_METHOD": "Método de pago: {method}",
  "notification.SOURCE_ENTITY": "Entidad de origen: {source}",
  "notification.ADD_PAYMENT_HINT":
    "Ten saldo disponible y registra el método de pago y la entidad de origen para ejecutar el movimiento.",
};

function isNotificationKey(value: string): boolean {
  return /^notification\.[A-Z][A-Z0-9_]*$/.test(value);
}

function prettifyKey(key: string): string {
  const segment = (key.split(".").pop() ?? key).replace(/_(TITLE|DESCRIPTION)$/, "");
  return segment
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

export function translateTitle(raw: string | null | undefined): string {
  if (!raw) return "Notificación";
  if (isNotificationKey(raw)) {
    return TITLE_TRANSLATIONS[raw] ?? prettifyKey(raw);
  }
  return raw;
}

export function translateDescription(
  raw: string | null | undefined,
  kind: NotificationKind,
): string | null {
  if (!raw) return null;
  if (!isNotificationKey(raw)) return raw;

  const template = DESCRIPTION_TRANSLATIONS[raw];
  if (template && !template.includes("{")) return template;

  if (template?.includes("{")) {
    return kind === "import"
      ? "Toca para ver el resultado completo de la carga de extractos."
      : prettifyKey(raw);
  }

  return prettifyKey(raw);
}

export function getNotificationKind(
  n: Pick<NotificationPayload, "title" | "reference">,
): NotificationKind {
  const ref = n.reference ?? "";
  if (ref.startsWith("statement-import")) return "import";
  if (ref.startsWith("fixed:reminder") || (n.title ?? "").startsWith("notification.UPCOMING")) {
    return "reminder";
  }
  return "system";
}

export interface ImportReferenceInfo {
  kind: "import";
  jobId?: number;
  timestamp?: number;
}

/**
 * Referencias de carga de extractos:
 * - formato actual: `statement-import:<jobId>`
 * - formato legado: `statement-import:<successFiles>:<timestamp>`
 */
export function parseImportReference(
  reference: string | null | undefined,
): ImportReferenceInfo | null {
  if (!reference || !reference.startsWith("statement-import")) return null;
  const [, a, b] = reference.split(":");
  const jobId = a ? Number.parseInt(a, 10) : NaN;
  const timestamp = b ? Number.parseInt(b, 10) : NaN;
  return {
    kind: "import",
    jobId: Number.isInteger(jobId) && jobId > 0 ? jobId : undefined,
    timestamp: Number.isInteger(timestamp) && timestamp > 0 ? timestamp : undefined,
  };
}

export interface ResolvedNotification {
  kind: NotificationKind;
  title: string;
  description: string | null;
}

export function resolveNotification(
  n: Pick<NotificationPayload, "title" | "description" | "reference">,
): ResolvedNotification {
  const kind = getNotificationKind(n);
  return {
    kind,
    title: translateTitle(n.title),
    description: translateDescription(n.description, kind),
  };
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });
}

export interface NotificationGroup {
  label: string;
  items: NotificationPayload[];
}

const DAY_MS = 86_400_000;

export function groupNotifications(items: NotificationPayload[]): NotificationGroup[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();

  const groups: NotificationGroup[] = [];
  for (const n of items) {
    const t = new Date(n.created_at).getTime();
    let label: string;
    if (t >= today) label = "Hoy";
    else if (t >= today - DAY_MS) label = "Ayer";
    else if (t >= today - 7 * DAY_MS) label = "Esta semana";
    else label = "Anteriores";

    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}
