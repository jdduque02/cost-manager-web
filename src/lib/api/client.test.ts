import {
  setTokens,
  getAccessToken,
  clearTokens,
  setStoredUserId,
  getStoredUserId,
  ApiError,
  api,
  apiFetchBlob,
  downloadBlob,
  tryRestoreSession,
  resetSessionExpiredFlag,
  HAS_SESSION_KEY,
  ensureCsrfToken,
  resetCsrfToken,
} from "./client";
import { setLocale } from "@/lib/i18n/errors";

describe("token management", () => {
  beforeEach(() => {
    clearTokens();
  });

  it("setTokens stores access token", () => {
    setTokens("test-token-123");
    expect(getAccessToken()).toBe("test-token-123");
  });

  it("getAccessToken returns null when no token set", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("clearTokens removes token and userId", () => {
    setTokens("token", undefined, "user-1");
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getStoredUserId()).toBeNull();
  });

  it("setStoredUserId stores userId as string", () => {
    setStoredUserId(123);
    expect(getStoredUserId()).toBe("123");
  });

  it("setStoredUserId with null clears userId", () => {
    setStoredUserId("user-1");
    setStoredUserId(null);
    expect(getStoredUserId()).toBeNull();
  });

  it("setTokens stores userId when provided", () => {
    setTokens("token", undefined, "42");
    expect(getStoredUserId()).toBe("42");
  });

  it("setTokens dispatches cm:tokens-updated event", () => {
    const spy = vi.spyOn(window, "dispatchEvent");
    setTokens("token");
    expect(spy).toHaveBeenCalledWith(expect.any(CustomEvent));
    spy.mockRestore();
  });
});

describe("ApiError", () => {
  it("creates error with message and status", () => {
    const error = new ApiError("Not found", 404);
    expect(error.message).toBe("Not found");
    expect(error.status).toBe(404);
    expect(error.name).toBe("ApiError");
    expect(error.details).toEqual([]);
  });

  it("creates error with validation details", () => {
    const details = [{ property: "email", constraints: { isEmail: "must be email" } }];
    const error = new ApiError("Validation failed", 400, details);
    expect(error.details).toEqual(details);
  });

  it("is instanceof Error", () => {
    const error = new ApiError("test", 500);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("api helpers", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  it("api.get calls fetch with GET method", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ status: true, data: [{ id: 1 }], message: "ok", timestamp: "" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.get("test-endpoint");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("test-endpoint"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("api.post calls fetch with POST method and body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ status: true, data: [{ id: 1 }], message: "ok", timestamp: "" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.post("test-endpoint", { name: "test" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("test-endpoint"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("api.delete calls fetch with DELETE method", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.delete("test-endpoint/1");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("test-endpoint/1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("api.getOne returns single item from array response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: true,
          data: [{ id: 1, name: "item" }],
          message: "ok",
          timestamp: "",
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await api.getOne<{ id: number; name: string }>("test-endpoint");
    expect(result).toEqual({ id: 1, name: "item" });
  });
});

describe("localized API errors", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    setLocale("es");
    vi.unstubAllGlobals();
  });

  const ipBlocked = () =>
    vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ status: 403, message: "auth.IP_NOT_ALLOWED", details: [] }),
    });

  it("localizes a coded 403 in es and keeps the original code", async () => {
    setLocale("es");
    vi.stubGlobal("fetch", ipBlocked());
    const err = await api.get("x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Tu dirección IP no tiene permiso para acceder.");
    expect(err.code).toBe("auth.IP_NOT_ALLOWED");
    expect(err.status).toBe(403);
  });

  it("localizes a coded 403 in en and keeps the original code", async () => {
    setLocale("en");
    vi.stubGlobal("fetch", ipBlocked());
    const err = await api.get("x").catch((e) => e);
    expect(err.message).toBe("Your IP address is not allowed to access.");
    expect(err.code).toBe("auth.IP_NOT_ALLOWED");
  });

  it("keeps free-text messages and sets no code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "El monto es inválido" }),
      }),
    );
    const err = await api.get("x").catch((e) => e);
    expect(err.message).toBe("El monto es inválido");
    expect(err.code).toBeUndefined();
  });

  it("uses the status fallback when the error body is not JSON", async () => {
    setLocale("es");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: () => Promise.reject(new Error()) }),
    );
    const err = await api.get("x").catch((e) => e);
    expect(err.message).toBe("Error del servidor. Intenta de nuevo más tarde.");
  });

  it("wraps a network failure as ApiError status 0 with a localized message", async () => {
    setLocale("en");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const err = await api.get("x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.message).toBe("Can't reach the server. Check your connection.");
  });

  it("does not wrap AbortError", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));
    await expect(api.get("x")).rejects.toBe(abort);
  });

  it("localizes errors from apiFetchBlob too", async () => {
    setLocale("en");
    vi.stubGlobal("fetch", ipBlocked());
    const err = await apiFetchBlob("report").catch((e) => e);
    expect(err.message).toBe("Your IP address is not allowed to access.");
    expect(err.code).toBe("auth.IP_NOT_ALLOWED");
  });
});

describe("ensureCsrfToken", () => {
  beforeEach(() => {
    resetCsrfToken();
    vi.restoreAllMocks();
  });

  it("fetches the token from GET csrf-token and caches it in memory", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: true,
          data: [{ csrfToken: "signed-token" }],
          message: "ok",
          timestamp: "",
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const token = await ensureCsrfToken();
    expect(token).toBe("signed-token");

    // Second call reuses the cached value: no second network call.
    const token2 = await ensureCsrfToken();
    expect(token2).toBe("signed-token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent calls into a single fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: true,
          data: [{ csrfToken: "signed-token" }],
          message: "ok",
          timestamp: "",
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const [a, b] = await Promise.all([ensureCsrfToken(), ensureCsrfToken()]);
    expect(a).toBe("signed-token");
    expect(b).toBe("signed-token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("resolves to null (does not throw) when the backend call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );

    const token = await ensureCsrfToken();
    expect(token).toBeNull();
  });

  it("apiFetch sends x-csrf-token once a token has been fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: true,
            data: [{ csrfToken: "signed-token" }],
            message: "ok",
            timestamp: "",
          }),
      }),
    );
    await ensureCsrfToken();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: true, data: [], message: "ok", timestamp: "" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.post("auth/logout", {});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("auth/logout"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-csrf-token": "signed-token" }),
      }),
    );
  });
});

describe("paginated envelope", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  const paginated = {
    status: true,
    message: "ok",
    data: [{ id: 1 }, { id: 2 }],
    total: 57,
    timestamp: "",
  };

  it("getPaginated reads total from the envelope root", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(paginated) }),
    );
    const result = await api.getPaginated<{ data: { id: number }[]; total: number }>("items");
    expect(result).toEqual({ data: [{ id: 1 }, { id: 2 }], total: 57 });
  });

  it("get returns just the items of a paginated envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(paginated) }),
    );
    expect(await api.get("items")).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("getPaginated falls back to data.length when total is missing", async () => {
    const { total: _omit, ...noTotal } = paginated;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(noTotal) }),
    );
    const result = await api.getPaginated<{ total: number }>("items");
    expect(result.total).toBe(2);
  });
});

describe("apiFetchBlob", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  it("returns the blob and parses the filename from Content-Disposition", async () => {
    const fakeBlob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="reporte-financiero-1.pdf"',
      }),
      blob: () => Promise.resolve(fakeBlob),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await apiFetchBlob("users/1/intelligence/report");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("users/1/intelligence/report"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.blob).toBe(fakeBlob);
    expect(result.filename).toBe("reporte-financiero-1.pdf");
  });

  it("parses an unquoted filename without swallowing trailing attributes", async () => {
    const fakeBlob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "Content-Disposition": "attachment; filename=reporte.pdf",
      }),
      blob: () => Promise.resolve(fakeBlob),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await apiFetchBlob("users/1/intelligence/report");
    expect(result.filename).toBe("reporte.pdf");
  });

  it("returns a null filename when Content-Disposition is missing", async () => {
    const fakeBlob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      blob: () => Promise.resolve(fakeBlob),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await apiFetchBlob("users/1/intelligence/report");
    expect(result.filename).toBeNull();
  });

  it("falls through to error handling when refresh-on-401 itself fails", async () => {
    const mockFetch = vi.fn((url: string) => {
      if (url.includes("auth/refresh")) {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ message: "Unauthorized" }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(apiFetchBlob("users/1/intelligence/report")).rejects.toThrow(ApiError);
  });

  it("throws ApiError when the response is not ok", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: () => Promise.resolve({ message: "boom" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(apiFetchBlob("users/1/intelligence/report")).rejects.toThrow(ApiError);
  });
});

describe("downloadBlob", () => {
  it("creates an object URL, clicks a temporary link, then revokes the URL", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    downloadBlob(new Blob(["x"]), "reporte.pdf");

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    vi.restoreAllMocks();
  });
});

describe("same-tab refresh coordination", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  it("dedupes concurrent 401s in the same tab to a single refresh call and resolves promptly", async () => {
    let refreshCalls = 0;
    let endpointCalls = 0;

    const mockFetch = vi.fn((url: string) => {
      if (url.includes("auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: true,
              data: [{ access_token: "new-token", expires_in: 3600 }],
              message: "ok",
              timestamp: "",
            }),
        });
      }

      endpointCalls += 1;
      // Both initial (pre-refresh) requests get a 401; retries after the
      // shared refresh succeed.
      if (endpointCalls <= 2) {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ status: true, data: [{ ok: true }], message: "ok", timestamp: "" }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const start = Date.now();
    await Promise.all([api.get("protected-a"), api.get("protected-b")]);
    const elapsedMs = Date.now() - start;

    // Only one real refresh call should happen for two concurrent 401s in
    // the same tab (see refreshTokensCoordinated in client.ts).
    expect(refreshCalls).toBe(1);
    // Previously this same-tab case waited on a BroadcastChannel message
    // that never arrives in the originating tab, stalling for the 5s
    // timeout before falling back. It should now resolve almost instantly.
    expect(elapsedMs).toBeLessThan(1000);
  });
});

describe("session restore without an active session", () => {
  beforeEach(() => {
    clearTokens();
    resetSessionExpiredFlag();
    vi.restoreAllMocks();
  });

  it("skips the auth/refresh call entirely when the browser has no session marker", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const restored = await tryRestoreSession();

    // First visit to a public route (landing/login): nothing in this browser
    // says a session ever existed, so don't waste a round trip confirming it.
    expect(restored).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("does not dispatch session-expired when auth/refresh 401s without an in-memory token", async () => {
    window.localStorage.setItem(HAS_SESSION_KEY, "1");
    const events: string[] = [];
    const listener = () => events.push("event");
    window.addEventListener("cm:session-expired", listener);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) }),
    );

    const restored = await tryRestoreSession();

    expect(restored).toBe(false);
    // A stale session marker (cookie expired/revoked server-side) 401s on
    // reload before any access token is in memory: still "not logged in",
    // not an expired session, so it must not trigger the reload loop
    // (cm:session-expired -> location = /login).
    expect(events).toEqual([]);
    expect(getAccessToken()).toBeNull();

    window.removeEventListener("cm:session-expired", listener);
    vi.unstubAllGlobals();
  });

  it("dispatches session-expired exactly once when refresh 401s with an active session", async () => {
    setTokens("stale-access-token");
    const events: string[] = [];
    const listener = () => events.push("event");
    window.addEventListener("cm:session-expired", listener);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) }),
    );

    const restored = await tryRestoreSession();

    expect(restored).toBe(false);
    expect(events).toEqual(["event"]);
    expect(getAccessToken()).toBeNull();

    window.removeEventListener("cm:session-expired", listener);
    vi.unstubAllGlobals();
  });

  it("keeps the session marker when restore fails with 429/5xx/network, clears it on 400/401", async () => {
    const outcomes: Array<[unknown, boolean]> = [
      [{ ok: false, status: 503, json: () => Promise.resolve({}) }, true],
      [{ ok: false, status: 429, json: () => Promise.resolve({}) }, true],
      [new TypeError("Failed to fetch"), true],
      [{ ok: false, status: 400, json: () => Promise.resolve({}) }, false],
      [{ ok: false, status: 401, json: () => Promise.resolve({}) }, false],
    ];
    for (const [outcome, markerKept] of outcomes) {
      window.localStorage.setItem(HAS_SESSION_KEY, "1");
      vi.stubGlobal(
        "fetch",
        outcome instanceof Error
          ? vi.fn().mockRejectedValue(outcome)
          : vi.fn().mockResolvedValue(outcome),
      );

      expect(await tryRestoreSession()).toBe(false);
      expect(window.localStorage.getItem(HAS_SESSION_KEY) === "1").toBe(markerKept);
    }
    vi.unstubAllGlobals();
  });

  it("restores tokens when auth/refresh succeeds and stores the userId", async () => {
    window.localStorage.setItem(HAS_SESSION_KEY, "1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: true,
            data: [{ access_token: "fresh-token", userId: 7, expires_in: 3600 }],
            message: "ok",
            timestamp: "",
          }),
      }),
    );

    const restored = await tryRestoreSession();

    expect(restored).toBe(true);
    expect(getAccessToken()).toBe("fresh-token");
    expect(getStoredUserId()).toBe("7");
    vi.unstubAllGlobals();
  });
});

describe("refresh on use (no timer)", () => {
  const T0 = new Date("2026-10-02T12:00:00Z");

  const okJson = (body: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

  /** fetch mock: auth/refresh devuelve `new-token`; el resto responde 200 vacío. */
  const mockApi = () =>
    vi.fn((url: string, _init?: RequestInit) =>
      url.includes("auth/refresh")
        ? okJson({
            status: true,
            data: [{ access_token: "new-token", expires_in: 300 }],
            message: "ok",
            timestamp: "",
          })
        : okJson({ status: true, data: [], message: "ok", timestamp: "" }),
    );

  const refreshCalls = (m: ReturnType<typeof mockApi>) =>
    m.mock.calls.filter(([url]) => url.includes("auth/refresh")).length;

  beforeEach(() => {
    vi.useFakeTimers({ now: T0 });
    clearTokens();
    resetSessionExpiredFlag();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("refreshes before the request when the token is about to expire, and sends the new Bearer", async () => {
    setTokens("old-token", undefined, undefined, 300);
    vi.setSystemTime(T0.getTime() + 200_000); // pasó más de 1/3 (100 s) de los 300 s
    const mockFetch = mockApi();
    vi.stubGlobal("fetch", mockFetch);

    await api.get("accounts");

    const urls = mockFetch.mock.calls.map(([url]) => url);
    expect(urls[0]).toContain("auth/refresh");
    expect(urls[1]).toContain("accounts");
    const headers = mockFetch.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer new-token");
  });

  it("does not refresh when the token is still valid", async () => {
    setTokens("valid-token", undefined, undefined, 300);
    vi.setSystemTime(T0.getTime() + 60_000); // < 1/3 (100 s) de los 300 s
    const mockFetch = mockApi();
    vi.stubGlobal("fetch", mockFetch);

    await api.get("accounts");

    expect(refreshCalls(mockFetch)).toBe(0);
    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer valid-token");
  });

  it("refreshes exactly once the 1/3 mark of the token lifetime is reached, not before", async () => {
    setTokens("tok", undefined, undefined, 300);
    const mockFetch = mockApi();
    vi.stubGlobal("fetch", mockFetch);

    vi.setSystemTime(T0.getTime() + 99_000);
    await api.get("accounts");
    expect(refreshCalls(mockFetch)).toBe(0);

    vi.setSystemTime(T0.getTime() + 100_000);
    await api.get("accounts");
    expect(refreshCalls(mockFetch)).toBe(1);
  });

  it("does not expire the session when auth/refresh answers 503 or 429", async () => {
    for (const status of [503, 429]) {
      resetSessionExpiredFlag();
      setTokens("tok", undefined, undefined, 300);
      vi.setSystemTime(Date.now() + 250_000);
      const events: string[] = [];
      const listener = () => events.push("event");
      window.addEventListener("cm:session-expired", listener);
      const mockFetch = vi.fn((url: string) =>
        url.includes("auth/refresh")
          ? Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) })
          : okJson({ status: true, data: [{ id: 1 }], message: "ok", timestamp: "" }),
      );
      vi.stubGlobal("fetch", mockFetch);

      await expect(api.get("accounts")).resolves.toEqual([{ id: 1 }]);

      expect(events).toEqual([]);
      expect(getAccessToken()).toBe("tok");
      window.removeEventListener("cm:session-expired", listener);
    }
  });

  it("expires the session when auth/refresh answers 401 or 400", async () => {
    for (const status of [401, 400]) {
      resetSessionExpiredFlag();
      setTokens("tok", undefined, undefined, 300);
      vi.setSystemTime(Date.now() + 250_000);
      const events: string[] = [];
      const listener = () => events.push("event");
      window.addEventListener("cm:session-expired", listener);
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string) =>
          url.includes("auth/refresh")
            ? Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) })
            : okJson({ status: true, data: [], message: "ok", timestamp: "" }),
        ),
      );

      await api.get("accounts");

      expect(events).toEqual(["event"]);
      expect(getAccessToken()).toBeNull();
      window.removeEventListener("cm:session-expired", listener);
    }
  });

  it("does not retry the pre-emptive refresh for ~15 s after a transient failure, then retries", async () => {
    setTokens("tok", undefined, undefined, 300);
    vi.setSystemTime(T0.getTime() + 250_000);
    const mockFetch = vi.fn((url: string) =>
      url.includes("auth/refresh")
        ? Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) })
        : okJson({ status: true, data: [], message: "ok", timestamp: "" }),
    );
    vi.stubGlobal("fetch", mockFetch);
    const refreshes = () => mockFetch.mock.calls.filter(([u]) => u.includes("auth/refresh")).length;

    await api.get("a");
    await api.get("b");
    expect(refreshes()).toBe(1); // la segunda petición cae en el backoff

    vi.setSystemTime(Date.now() + 16_000);
    await api.get("c");
    expect(refreshes()).toBe(2);
  });

  it("clears the backoff on a successful login/refresh (setTokens)", async () => {
    setTokens("tok", undefined, undefined, 300);
    vi.setSystemTime(T0.getTime() + 250_000);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );
    await api.get("a").catch(() => null); // fallo de red -> backoff activo

    const mockFetch = mockApi();
    vi.stubGlobal("fetch", mockFetch);
    setTokens("tok2", undefined, undefined, 300);
    vi.setSystemTime(Date.now() + 250_000);
    await api.get("b");

    expect(refreshCalls(mockFetch)).toBe(1);
  });

  it("does not refresh by clock: with no requests, time passing triggers nothing", async () => {
    const mockFetch = mockApi();
    vi.stubGlobal("fetch", mockFetch);
    setTokens("idle-token", undefined, undefined, 300);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("idle-token");
  });

  it("dedupes N concurrent requests with an expiring token into a single refresh", async () => {
    setTokens("old-token", undefined, undefined, 300);
    vi.setSystemTime(T0.getTime() + 250_000);
    const mockFetch = mockApi();
    vi.stubGlobal("fetch", mockFetch);

    await Promise.all([api.get("a"), api.get("b"), apiFetchBlob("c").catch(() => null)]);

    expect(refreshCalls(mockFetch)).toBe(1);
  });

  it("still sends the request when the pre-emptive refresh fails (the 401 path decides)", async () => {
    setTokens("old-token", undefined, undefined, 300);
    vi.setSystemTime(T0.getTime() + 250_000);
    const mockFetch = vi.fn((url: string) =>
      url.includes("auth/refresh")
        ? Promise.reject(new TypeError("Failed to fetch"))
        : okJson({ status: true, data: [{ id: 1 }], message: "ok", timestamp: "" }),
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(api.get("accounts")).resolves.toEqual([{ id: 1 }]);
  });

  it("adopts the expiry of a token broadcast by another tab, so this tab does not refresh", async () => {
    // Un refresh propio inicializa el canal (como al restaurar sesión al cargar).
    window.localStorage.setItem(HAS_SESSION_KEY, "1");
    const mockFetch = mockApi();
    vi.stubGlobal("fetch", mockFetch);
    await tryRestoreSession();

    // Otra pestaña renueva más tarde y difunde su token con su expiración.
    vi.setSystemTime(T0.getTime() + 250_000);
    const otherTab = new BroadcastChannel("cm-auth");
    otherTab.postMessage({ type: "cm:new-token", token: "other-tab-token", expiresIn: 300 });
    await vi.waitFor(() => expect(getAccessToken()).toBe("other-tab-token"));
    otherTab.close();

    mockFetch.mockClear();
    await api.get("accounts");

    expect(refreshCalls(mockFetch)).toBe(0);
    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer other-tab-token");
  });
});
