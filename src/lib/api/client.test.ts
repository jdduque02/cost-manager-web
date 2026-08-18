import {
  setTokens,
  getAccessToken,
  clearTokens,
  setStoredUserId,
  getStoredUserId,
  ApiError,
  api,
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
