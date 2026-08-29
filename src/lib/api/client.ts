/**
 * API Client — Sprig Backend
 * Base URL: http://localhost:3000/api/v1
 *
 * Auth hybrid:
 * - access token en memoria (no localStorage) + cookie httpOnly del backend
 * - refresh token solo en cookie httpOnly; el body de refresh es opcional
 * - credentials: 'include' en todos los fetch
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1") + "/";

/** Access token en memoria (XSS-safe vs localStorage). */
let memoryAccessToken: string | null = null;
let memoryUserId: string | null = null;
let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

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
 * Unwrap the ApiResponseDto envelope.
 * - Paginated: data = [{ data: [...items], total: N }] → returns items array by default
 * - All others: data = [item1, ...] → returns the array as-is
 * Use `preservePaginated: true` in apiFetch to keep `{ data, total }`.
 */
function unwrapEnvelope<T>(json: Record<string, unknown>, preservePaginated = false): T {
  const data = json.data as unknown[];
  if (data.length === 0) return [] as unknown as T;
  if (data.length === 1) {
    const single = data[0];
    if (
      single !== null &&
      typeof single === "object" &&
      "data" in single &&
      "total" in single &&
      Array.isArray((single as Record<string, unknown>).data)
    ) {
      return (preservePaginated ? single : (single as Record<string, unknown>).data) as T;
    }
  }
  return data as unknown as T;
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
  if (userId !== undefined) memoryUserId = String(userId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cm:tokens-updated"));
  }
  if (expiresIn && expiresIn > 0) {
    scheduleProactiveRefresh(expiresIn);
  }
}

export function clearTokens() {
  memoryAccessToken = null;
  memoryUserId = null;
  cancelProactiveRefresh();
}

// ---------------------------------------------------------------------------
// Proactive refresh — schedules a refresh ~60 s before access token expiry
// ---------------------------------------------------------------------------

function scheduleProactiveRefresh(expiresIn: number) {
  cancelProactiveRefresh();
  const REFRESH_BUFFER_MS = 60_000; // 60 seconds before expiry
  const delayMs = expiresIn * 1000 - REFRESH_BUFFER_MS;
  if (delayMs <= 0) {
    // Token already near-expired; refresh immediately
    void refreshTokens().catch(() => {});
    return;
  }
  proactiveRefreshTimer = setTimeout(() => {
    proactiveRefreshTimer = null;
    void refreshTokens().catch(() => {});
  }, delayMs);
}

function cancelProactiveRefresh() {
  if (proactiveRefreshTimer !== null) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Multi-tab BroadcastChannel — only one tab refreshes; others wait
// ---------------------------------------------------------------------------
let broadcastChannel: BroadcastChannel | null = null;
let waitingForBroadcast: ((token: string) => void) | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel("cm-auth");
    broadcastChannel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === "cm:new-token" && event.data.token) {
        waitingForBroadcast?.(event.data.token);
        waitingForBroadcast = null;
      }
      if (event.data?.type === "cm:session-expired") {
        handleSessionExpired();
      }
    };
  }
  return broadcastChannel;
}

function broadcastNewToken(token: string) {
  getBroadcastChannel()?.postMessage({ type: "cm:new-token", token });
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

export function getStoredUserId(): string | null {
  return memoryUserId;
}

export function setStoredUserId(userId: string | number | null) {
  memoryUserId = userId == null ? null : String(userId);
}

let refreshInFlight: Promise<{ access_token: string; refresh_token?: string }> | null = null;

async function requestNewTokens(): Promise<{ access_token: string; refresh_token?: string }> {
  const refreshRes = await fetch(`${BASE_URL}auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (!refreshRes.ok) {
    handleSessionExpired();
    broadcastSessionExpired();
    throw new Error("Session expired. Please log in again.");
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
  broadcastNewToken(tokens.access_token);
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
 * This is only invoked after a 401, so we always force a real refresh;
 * reusing the in-memory token here would just retry with the rejected token.
 */
function refreshTokensCoordinated(): Promise<{ access_token: string; refresh_token?: string }> {
  // If refresh is in-flight, wait for it via BroadcastChannel
  if (refreshInFlight) {
    const channel = getBroadcastChannel();
    if (channel) {
      return new Promise((resolve) => {
        waitingForBroadcast = (token: string) => {
          resolve({ access_token: token });
        };
        // Timeout: if broadcast doesn't arrive in 5s, fall through to own refresh
        setTimeout(() => {
          if (waitingForBroadcast) {
            waitingForBroadcast = null;
            resolve(refreshTokens());
          }
        }, 5000);
      });
    }
  }
  return refreshTokens();
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
  try {
    await refreshTokens();
    return !!memoryAccessToken;
  } catch {
    clearTokens();
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
  const token = explicitToken ?? getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const url = `${BASE_URL}${path}`;
  let res = await fetch(url, { ...fetchOptions, headers, credentials: "include" });

  if (res.status === 401) {
    try {
      res = await refreshAndRetry(url, { ...fetchOptions, headers });
    } catch {
      // fall through to error handling
    }
  }

  if (!res.ok) {
    let message = `API error ${res.status}`;
    let details: ValidationErrorDetail[] = [];
    const meta: ApiErrorMeta = {};
    try {
      const err = await res.json();
      message = err.message ?? err.error ?? message;
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

async function parseResponseError(res: Response): Promise<ApiError> {
  let message = `API error ${res.status}`;
  let details: ValidationErrorDetail[] = [];
  try {
    const err = await res.json();
    message = err.message ?? err.error ?? message;
    if (Array.isArray(err.details)) {
      details = err.details;
    }
  } catch {
    // ignore JSON parse errors
  }
  return new ApiError(message, res.status, details);
}

export async function apiPostForm<T = unknown>(
  path: string,
  formData: FormData,
  token?: string | null,
): Promise<T> {
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
