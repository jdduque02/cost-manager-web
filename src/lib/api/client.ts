/**
 * API Client — Sprig Backend
 * Base URL: http://localhost:3000/api/v1
 *
 * Auth hybrid:
 * - access token en memoria (no localStorage) + cookie httpOnly del backend
 * - refresh token solo en cookie httpOnly; el body de refresh es opcional
 * - credentials: 'include' en todos los fetch
 * - renovación por uso, sin temporizador: cada petición al API renueva el access
 *   token si ya pasó 1/3 de su vida. Una sesión sin uso caduca cuando vence el refresh
 *   token de Keycloak (la cookie), no antes.
 */

import { translateApiMessage } from "@/lib/i18n/errors";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1") + "/";

/** Access token en memoria (XSS-safe vs localStorage). */
let memoryAccessToken: string | null = null;
let memoryUserId: string | null = null;
/** Epoch ms en que se emitió/adoptó el access token en memoria (null = desconocido). */
let accessIssuedAt: number | null = null;
/** Vida total del access token en ms (null = desconocida). */
let accessLifetimeMs: number | null = null;
/** Fracción de la vida del token tras la cual una petición lo renueva primero. */
const REFRESH_LIFETIME_DIVISOR = 3;
/** Tras un refresh proactivo fallido, no reintentarlo durante este lapso (evita martillar con 429/5xx). */
const REFRESH_BACKOFF_MS = 15_000;
let refreshBackoffUntil = 0;

function setAccessExpiry(expiresIn?: number) {
  const known = !!expiresIn && expiresIn > 0;
  accessIssuedAt = known ? Date.now() : null;
  accessLifetimeMs = known ? expiresIn * 1000 : null;
}

/**
 * Token CSRF (doble-submit cookie) en memoria. Lo exige el backend solo en
 * `POST /auth/logout` (la única mutación que puede llegar sin Bearer, ver
 * `csrf.config.ts` del backend); se manda igual en toda request por si acaso,
 * no tiene costo en las rutas donde el backend lo ignora.
 */
let memoryCsrfToken: string | null = null;
let csrfTokenFetch: Promise<string | null> | null = null;

/**
 * Marca (no el token, solo un booleano) de que hubo login en este navegador.
 * La cookie de refresh es httpOnly (JS no puede leerla), así que este flag es
 * la única señal disponible para evitar llamar `auth/refresh` en visitantes
 * que nunca han iniciado sesión (p. ej. la primera carga de una página pública).
 */
export const HAS_SESSION_KEY = "cm:has-session";

function markSessionPresent(): void {
  try {
    window.localStorage.setItem(HAS_SESSION_KEY, "1");
  } catch {
    // Modo privado / cuota llena: sin marca, tryRestoreSession igual intentará el refresh.
  }
}

function clearSessionMarker(): void {
  try {
    window.localStorage.removeItem(HAS_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function hasStoredSession(): boolean {
  try {
    return window.localStorage.getItem(HAS_SESSION_KEY) === "1";
  } catch {
    return true; // sin acceso a localStorage: no se puede descartar, deja intentar el refresh
  }
}

/** Check if response has ApiResponseDto shape */
function isApiResponseEnvelope(json: unknown): json is {
  status: boolean;
  message: string;
  data: unknown[];
  timestamp: string;
} {
  return (
    json !== null &&
    typeof json === "object" &&
    "status" in json &&
    typeof (json as Record<string, unknown>).status === "boolean" &&
    "data" in json &&
    Array.isArray((json as Record<string, unknown>).data)
  );
}

/**
 * Unwrap the ApiResponseDto envelope `{ status, message, data: T[], total?, timestamp }`.
 * Paginated responses carry `total` at the envelope ROOT (not inside `data`).
 * By default returns the `data` array; with `preservePaginated: true` returns
 * `{ data, total }` (total falls back to `data.length` when the API omits it).
 */
function unwrapEnvelope<T>(json: Record<string, unknown>, preservePaginated = false): T {
  const data = json.data as unknown[];
  if (!preservePaginated) return data as unknown as T;
  const total = typeof json.total === "number" ? json.total : data.length;
  return { data, total } as unknown as T;
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setTokens(
  access: string,
  _refresh?: string,
  userId?: number | string,
  expiresIn?: number,
) {
  memoryAccessToken = access;
  setAccessExpiry(expiresIn);
  refreshBackoffUntil = 0;
  if (userId !== undefined) memoryUserId = String(userId);
  markSessionPresent();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cm:tokens-updated"));
  }
}

/** `keepSessionMarker`: tras un error transitorio, el próximo arranque reintenta el restore. */
export function clearTokens({ keepSessionMarker = false } = {}) {
  memoryAccessToken = null;
  memoryUserId = null;
  accessIssuedAt = null;
  accessLifetimeMs = null;
  refreshBackoffUntil = 0;
  if (!keepSessionMarker) clearSessionMarker();
}

// ---------------------------------------------------------------------------
// Multi-tab BroadcastChannel — only one tab refreshes; others wait
// ---------------------------------------------------------------------------
let broadcastChannel: BroadcastChannel | null = null;

/**
 * Adopts a token broadcast by ANOTHER tab. `onmessage` never fires in the
 * tab that called `postMessage`, so this only ever runs in tabs that did not
 * originate the refresh — i.e. genuinely different tabs, which never share
 * this tab's `refreshInFlight` JS variable in the first place.
 */
function adoptBroadcastToken(token: string, expiresIn?: number, userId?: string) {
  memoryAccessToken = token;
  setAccessExpiry(expiresIn);
  // Sin userId, el bootstrap de AuthProvider descartaría el token (y la marca de sesión).
  if (userId) memoryUserId = userId;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cm:tokens-updated"));
  }
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel("cm-auth");
    broadcastChannel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === "cm:new-token" && event.data.token) {
        adoptBroadcastToken(event.data.token, event.data.expiresIn, event.data.userId);
      }
      if (event.data?.type === "cm:session-expired") {
        handleSessionExpired();
      }
    };
  }
  return broadcastChannel;
}

function broadcastNewToken(token: string, expiresIn?: number, userId?: string) {
  getBroadcastChannel()?.postMessage({ type: "cm:new-token", token, expiresIn, userId });
}

function broadcastSessionExpired() {
  getBroadcastChannel()?.postMessage({ type: "cm:session-expired" });
}

// ---------------------------------------------------------------------------
// Session-expired event — dispatched so AuthContext can toast + redirect
// ---------------------------------------------------------------------------
let sessionExpiredDispatched = false;

function handleSessionExpired() {
  if (sessionExpiredDispatched) return;
  sessionExpiredDispatched = true;
  clearTokens();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cm:session-expired"));
  }
}

export function resetSessionExpiredFlag() {
  sessionExpiredDispatched = false;
}

/** Solo para tests: limpia el token CSRF cacheado en memoria. */
export function resetCsrfToken() {
  memoryCsrfToken = null;
  csrfTokenFetch = null;
}

export function getStoredUserId(): string | null {
  return memoryUserId;
}

export function setStoredUserId(userId: string | number | null) {
  memoryUserId = userId == null ? null : String(userId);
}

let refreshInFlight: Promise<{ access_token: string; refresh_token?: string }> | null = null;

async function requestNewTokens(): Promise<{ access_token: string; refresh_token?: string }> {
  // Only a session that we actually hold can "expire". On bootstrapping
  // (tryRestoreSession) there is no in-memory token yet, and a 401 from
  // auth/refresh simply means "not logged in" — dispatching the
  // session-expired event there caused AuthProvider to hard-reload the
  // page forever on every public page (see cm:session-expired listener).
  const hadSession = !!memoryAccessToken;
  const refreshRes = await fetch(`${BASE_URL}auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (!refreshRes.ok) {
    // Solo 400/401 significa que Keycloak rechazó el refresh token (sesión
    // muerta). 429/5xx son transitorios: no cierran la sesión del usuario.
    if (hadSession && (refreshRes.status === 400 || refreshRes.status === 401)) {
      handleSessionExpired();
      broadcastSessionExpired();
      throw new ApiError("Session expired. Please log in again.", refreshRes.status);
    }
    throw new ApiError(`Token refresh failed (${refreshRes.status})`, refreshRes.status);
  }

  const refreshJson = await refreshRes.json();
  const tokens = isApiResponseEnvelope(refreshJson)
    ? (refreshJson.data[0] as {
        access_token: string;
        refresh_token?: string;
        userId?: number;
        expires_in?: number;
      })
    : (refreshJson as {
        access_token: string;
        refresh_token?: string;
        userId?: number;
        expires_in?: number;
      });

  setTokens(
    tokens.access_token,
    tokens.refresh_token,
    tokens.userId ?? memoryUserId ?? undefined,
    tokens.expires_in,
  );
  broadcastNewToken(tokens.access_token, tokens.expires_in, memoryUserId ?? undefined);
  resetSessionExpiredFlag();
  return tokens;
}

function refreshTokens(): Promise<{ access_token: string; refresh_token?: string }> {
  if (!refreshInFlight) {
    refreshInFlight = requestNewTokens().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Refresh tokens with BroadcastChannel coordination.
 * Invoked after a 401 and by `ensureFreshToken` (token about to expire), so we
 * always force a real refresh; reusing the in-memory token would just resend it.
 *
 * `refreshInFlight` lives in this tab's JS memory, so it can only ever be
 * truthy when THIS SAME TAB already kicked off a refresh (e.g. two
 * concurrent 401s in the same tab). In that same-tab case we must await
 * `refreshInFlight` directly — `BroadcastChannel#onmessage` never fires in
 * the tab that called `postMessage`, so waiting on the broadcast here would
 * just stall for 5s (the timeout) before falling back. BroadcastChannel
 * coordination is only meaningful for genuinely different tabs, which never
 * observe a truthy `refreshInFlight` from another tab's refresh in the
 * first place (see `getBroadcastChannel`'s `onmessage` for that path).
 */
function refreshTokensCoordinated(): Promise<{ access_token: string; refresh_token?: string }> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  return refreshTokens();
}

/**
 * Renovación por uso: si el access token en memoria ya consumió 1/3 de su
 * vida (`REFRESH_LIFETIME_DIVISOR`), lo renueva antes de la petición
 * (deduplicado con `refreshInFlight`). Si la renovación falla, se traga el
 * error: la petición sale igual y el manejo existente del 401 decide.
 */
export async function ensureFreshToken(): Promise<void> {
  if (!memoryAccessToken || accessIssuedAt === null || accessLifetimeMs === null) return;
  if (Date.now() - accessIssuedAt < accessLifetimeMs / REFRESH_LIFETIME_DIVISOR) return;
  if (Date.now() < refreshBackoffUntil) return;
  try {
    await refreshTokensCoordinated();
  } catch {
    // cae al 401 existente; no reintentar el refresh proactivo durante el backoff
    refreshBackoffUntil = Date.now() + REFRESH_BACKOFF_MS;
  }
}

export interface ValidationErrorDetail {
  property: string;
  constraints: Record<string, string>;
}

export interface ApiErrorMeta {
  code?: string;
  account_id?: number;
  name?: string;
  current?: number;
  amount?: number;
}

export class ApiError extends Error {
  status: number;
  details: ValidationErrorDetail[];
  code?: string;
  meta: ApiErrorMeta;

  constructor(
    message: string,
    status: number,
    details: ValidationErrorDetail[] = [],
    meta: ApiErrorMeta = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = meta.code;
    this.meta = meta;
  }
}

/** Intenta recuperar sesión vía cookie de refresh (p. ej. al recargar). */
export async function tryRestoreSession(): Promise<boolean> {
  if (!hasStoredSession()) return false;
  try {
    await refreshTokens();
    return !!memoryAccessToken;
  } catch (err) {
    // Solo 400/401 = sesión muerta; 429/5xx/red conservan la marca para reintentar.
    if (err instanceof ApiError && (err.status === 400 || err.status === 401)) clearTokens();
    return false;
  }
}

export function onSessionExpired(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener("cm:session-expired", handler);
  return () => window.removeEventListener("cm:session-expired", handler);
}

async function refreshAndRetry(url: string, options: RequestInit): Promise<Response> {
  const tokens = await refreshTokensCoordinated();

  const retryOptions = {
    ...options,
    credentials: "include" as RequestCredentials,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${tokens.access_token}`,
    },
  };
  return fetch(url, retryOptions);
}

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
  /** Si true, las respuestas paginadas se devuelven como `{ data, total }`. */
  preservePaginated?: boolean;
}

/**
 * Main fetch wrapper. Automatically adds Authorization header, handles
 * token refresh on 401 responses, and unwraps ApiResponseDto envelope.
 */
async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token: explicitToken, preservePaginated = false, ...fetchOptions } = options;
  await ensureFreshToken();
  const token = explicitToken ?? getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(memoryCsrfToken ? { "x-csrf-token": memoryCsrfToken } : {}),
  };

  const url = `${BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...fetchOptions, headers, credentials: "include" });
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") throw e;
    throw new ApiError(translateApiMessage(undefined, 0), 0);
  }

  if (res.status === 401) {
    try {
      res = await refreshAndRetry(url, { ...fetchOptions, headers });
    } catch {
      // fall through to error handling
    }
  }

  if (!res.ok) {
    let message = translateApiMessage(undefined, res.status);
    let details: ValidationErrorDetail[] = [];
    const meta: ApiErrorMeta = {};
    try {
      const err = await res.json();
      const raw: string | undefined = err.message ?? err.error;
      message = translateApiMessage(raw, res.status);
      // Conserva el código original del API cuando el message era un código.
      if (raw && message !== raw) meta.code = raw;
      if (Array.isArray(err.details)) {
        details = err.details;
      }
      if (typeof err.code === "string") meta.code = err.code;
      if (typeof err.account_id === "number") meta.account_id = err.account_id;
      if (typeof err.name === "string") meta.name = err.name;
      if (typeof err.current === "number") meta.current = err.current;
      if (typeof err.amount === "number") meta.amount = err.amount;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(message, res.status, details, meta);
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (isApiResponseEnvelope(json)) {
    return unwrapEnvelope<T>(json, preservePaginated);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => apiFetch<T>(path, { method: "GET", token }),
  getPaginated: <T>(path: string, token?: string | null) =>
    apiFetch<T>(path, { method: "GET", token, preservePaginated: true }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body ?? {}), token }),
  put: <T>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body), token }),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body), token }),
  delete: <T>(path: string, token?: string | null) =>
    apiFetch<T>(path, { method: "DELETE", token }),
  deleteWithBody: <T>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(path, {
      method: "DELETE",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      token,
    }),
  getOne: async <T>(path: string, token?: string | null): Promise<T> => {
    const result = await apiFetch<T[]>(path, { method: "GET", token });
    return Array.isArray(result) ? result[0] : (result as unknown as T);
  },
};

/**
 * Garantiza que haya un token CSRF en memoria, pidiéndolo a `GET /csrf-token`
 * si falta. Idempotente: llamadas concurrentes comparten el mismo fetch.
 */
export async function ensureCsrfToken(): Promise<string | null> {
  if (memoryCsrfToken) return memoryCsrfToken;
  if (!csrfTokenFetch) {
    csrfTokenFetch = api
      .getOne<{ csrfToken: string }>("csrf-token")
      .then((result) => {
        memoryCsrfToken = result?.csrfToken ?? null;
        return memoryCsrfToken;
      })
      .catch(() => null)
      .finally(() => {
        csrfTokenFetch = null;
      });
  }
  return csrfTokenFetch;
}

async function parseResponseError(res: Response): Promise<ApiError> {
  let message = translateApiMessage(undefined, res.status);
  let details: ValidationErrorDetail[] = [];
  let code: string | undefined;
  try {
    const err = await res.json();
    const raw: string | undefined = err.message ?? err.error;
    message = translateApiMessage(raw, res.status);
    if (raw && message !== raw) code = raw;
    if (Array.isArray(err.details)) {
      details = err.details;
    }
  } catch {
    // ignore JSON parse errors
  }
  return new ApiError(message, res.status, details, { code });
}

/**
 * Fetches a binary response (e.g. a generated PDF) with the same Bearer +
 * 401-refresh handling as `apiFetch`, but WITHOUT the JSON envelope unwrap
 * (the response body is not `ApiResponseDto` JSON, it's raw bytes).
 * Returns the Blob plus the filename parsed from `Content-Disposition`, if any.
 */
export async function apiFetchBlob(
  path: string,
  token?: string | null,
): Promise<{ blob: Blob; filename: string | null }> {
  await ensureFreshToken();
  const authToken = token ?? getAccessToken();

  const headers: HeadersInit = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const url = `${BASE_URL}${path}`;
  let res = await fetch(url, { method: "GET", headers, credentials: "include" });

  if (res.status === 401) {
    try {
      res = await refreshAndRetry(url, { method: "GET", headers });
    } catch {
      // fall through to error handling below (mirrors apiFetch)
    }
  }

  if (!res.ok) {
    throw await parseResponseError(res);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"|filename=([^;]+)/);
  const filename = match ? ((match[1] ?? match[2])?.trim() ?? null) : null;
  return { blob, filename };
}

/**
 * Triggers a browser download of a Blob via a temporary object URL. The
 * object URL is revoked right after the click so it never lingers reachable
 * from outside this function (no token or session data is embedded in it —
 * it just references an in-memory Blob).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function apiPostForm<T = unknown>(
  path: string,
  formData: FormData,
  token?: string | null,
): Promise<T> {
  await ensureFreshToken();
  const authToken = token ?? getAccessToken();

  const headers: HeadersInit = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const url = `${BASE_URL}${path}`;
  let res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (res.status === 401 && authToken) {
    res = await refreshAndRetry(url, { method: "POST", headers, body: formData });
  }

  if (!res.ok) {
    throw await parseResponseError(res);
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (isApiResponseEnvelope(json)) {
    return unwrapEnvelope<T>(json);
  }

  return json as T;
}
