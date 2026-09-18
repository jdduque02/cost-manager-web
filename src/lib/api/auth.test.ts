import { authApi, type Session, type AccessEvent } from "./auth";
import { clearTokens } from "./client";

describe("authApi.getSessions", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  it("fetches the session list from auth/sessions", async () => {
    const sessions: Session[] = [
      {
        id: "session-1",
        ipAddress: "127.0.0.1",
        browser: "Chrome",
        start: "2026-09-01T00:00:00.000Z",
        lastAccess: "2026-09-02T00:00:00.000Z",
      },
    ];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: true, message: "ok", data: sessions, timestamp: "" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await authApi.getSessions();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("auth/sessions"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual(sessions);
  });

  it("returns lastAccess as null when the session has never been used again", async () => {
    const sessions: Session[] = [
      {
        id: "session-2",
        ipAddress: "10.0.0.1",
        browser: "Firefox",
        start: "2026-09-01T00:00:00.000Z",
        lastAccess: null,
      },
    ];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: true, message: "ok", data: sessions, timestamp: "" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await authApi.getSessions();
    expect(result[0].lastAccess).toBeNull();
  });
});

describe("authApi.revokeSession", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  it("sends a DELETE request scoped to the given sessionId", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });
    vi.stubGlobal("fetch", mockFetch);

    await authApi.revokeSession("session-1");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("auth/sessions/session-1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("authApi.getAccessHistory", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  it("fetches the access history from auth/access-history", async () => {
    const events: AccessEvent[] = [
      {
        type: "login",
        ipAddress: "127.0.0.1",
        time: "2026-09-01T00:00:00.000Z",
        error: null,
        details: {},
      },
    ];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: true, message: "ok", data: events, timestamp: "" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await authApi.getAccessHistory();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("auth/access-history"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual(events);
  });
});
