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
