/**
 * API Client — Cost Manager Backend
 * Base URL: http://localhost:3000/api/v1
 *
 * Authentication flow:
 * 1. POST /auth/login  → receives access_token + refresh_token
 * 2. All subsequent requests include Authorization: Bearer <access_token>
 * 3. On 401, call POST /auth/refresh with refresh_token
 *
 * Response envelope: All responses are wrapped in ApiResponseDto:
 * { status: boolean, message: string, data: T[], timestamp: string }
 * This client automatically unwraps the envelope.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

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
 * Handles two cases:
 * 1. Simple: data = [item] → return item
 * 2. Paginated: data = [{ data: [...], total }] → return the inner object
 */
function unwrapEnvelope<T>(json: Record<string, unknown>): T {
  const data = json.data as unknown[];
  if (data.length === 0) return undefined as T;
  if (data.length === 1) {
    const single = data[0];
    // Handle paginated response: { data: [...items], total: N }
    if (
      single !== null &&
      typeof single === "object" &&
      "data" in single &&
      "total" in single &&
      Array.isArray((single as Record<string, unknown>).data)
    ) {
      return single as T;
    }
    return single as T;
  }
  return data as unknown as T;
}

/** Retrieve stored token from localStorage */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cm_access_token");
}

export function setTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("cm_access_token", access);
  localStorage.setItem("cm_refresh_token", refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("cm_access_token");
  localStorage.removeItem("cm_refresh_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cm_refresh_token");
}

/** Refresh token and retry request on 401 */
async function refreshAndRetry(url: string, options: RequestInit): Promise<Response> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new Error("Session expired. Please log in again.");
  }

  const refreshRes = await fetch(`${BASE_URL}auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!refreshRes.ok) {
    clearTokens();
    throw new Error("Session expired. Please log in again.");
  }

  const refreshJson = await refreshRes.json();
  // Backend wraps in ApiResponseDto: { data: [{ access_token, refresh_token }] }
  const tokens = isApiResponseEnvelope(refreshJson)
    ? (refreshJson.data[0] as { access_token: string; refresh_token: string })
    : (refreshJson as { access_token: string; refresh_token: string });

  setTokens(tokens.access_token, tokens.refresh_token);

  const retryOptions = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${tokens.access_token}`,
    },
  };
  return fetch(url, retryOptions);
}

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

/**
 * Main fetch wrapper. Automatically adds Authorization header, handles
 * token refresh on 401 responses, and unwraps ApiResponseDto envelope.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { token: explicitToken, ...fetchOptions } = options;
  const token = explicitToken ?? getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const url = `${BASE_URL}${path}`;
  let res = await fetch(url, { ...fetchOptions, headers });

  if (res.status === 401 && token) {
    res = await refreshAndRetry(url, { ...fetchOptions, headers });
  }

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const err = await res.json();
      message = err.message ?? err.error ?? message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  // Unwrap ApiResponseDto envelope if present
  if (isApiResponseEnvelope(json)) {
    return unwrapEnvelope<T>(json);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => apiFetch<T>(path, { method: "GET", token }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body), token }),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body), token }),
  delete: <T>(path: string, token?: string | null) => apiFetch<T>(path, { method: "DELETE", token }),
};
