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
