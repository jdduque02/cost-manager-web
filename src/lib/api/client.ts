/**
 * API Client — Cost Manager Backend
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

export function setTokens(access: string, _refresh?: string, userId?: number | string) {
  memoryAccessToken = access;
  if (userId !== undefined) memoryUserId = String(userId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cm:tokens-updated"));
  }
}

export function clearTokens() {
  memoryAccessToken = null;
  memoryUserId = null;
}

export function getStoredUserId(): string | null {
  return memoryUserId;
}

export function getRefreshToken(): string | null {
  // Refresh vive en cookie httpOnly; el cliente no lo lee.
  return null;
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
    clearTokens();
    throw new Error("Session expired. Please log in again.");
  }

  const refreshJson = await refreshRes.json();
  const tokens = isApiResponseEnvelope(refreshJson)
    ? (refreshJson.data[0] as { access_token: string; refresh_token?: string; userId?: number })
    : (refreshJson as { access_token: string; refresh_token?: string; userId?: number });

  setTokens(tokens.access_token, tokens.refresh_token, tokens.userId ?? memoryUserId ?? undefined);
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

async function refreshAndRetry(url: string, options: RequestInit): Promise<Response> {
  const tokens = await refreshTokens();

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
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
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
    try {
      const err = await res.json();
      message = err.message ?? err.error ?? message;
    } catch {
      // ignore JSON parse errors
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
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

async function parseResponseError(res: Response): Promise<string> {
  let message = `API error ${res.status}`;
  try {
    const err = await res.json();
    message = err.message ?? err.error ?? message;
  } catch {
    // ignore JSON parse errors
  }
  return message;
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
    throw new Error(await parseResponseError(res));
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (isApiResponseEnvelope(json)) {
    return unwrapEnvelope<T>(json);
  }

  return json as T;
}
