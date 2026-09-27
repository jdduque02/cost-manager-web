import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useSessions,
  useRevokeSession,
  useAccessHistory,
  useCreateTransfer,
  useUpdateTransfer,
  useDeleteTransfer,
  useCloneTransfer,
} from "./use-api";
import type { Session, AccessEvent } from "@/lib/api/auth";

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    getSessions: vi.fn(),
    revokeSession: vi.fn(),
    getAccessHistory: vi.fn(),
  },
}));

vi.mock("@/lib/api/finance", () => ({
  financeApi: {
    createTransfer: vi.fn().mockResolvedValue({}),
    updateTransfer: vi.fn().mockResolvedValue({}),
    deleteTransfer: vi.fn().mockResolvedValue(undefined),
    cloneTransfer: vi.fn().mockResolvedValue({}),
  },
}));

const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { authApi } from "@/lib/api/auth";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userId: "user-1" });
  });

  it("fetches sessions for the current user", async () => {
    const sessions: Session[] = [
      {
        id: "session-1",
        ipAddress: "127.0.0.1",
        browser: "Chrome",
        start: "2026-09-01T00:00:00.000Z",
        lastAccess: null,
      },
    ];
    vi.mocked(authApi.getSessions).mockResolvedValue(sessions);

    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sessions);
    expect(authApi.getSessions).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when there is no authenticated userId", () => {
    mockUseAuth.mockReturnValue({ userId: null });

    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe("idle");
    expect(authApi.getSessions).not.toHaveBeenCalled();
  });

  it("surfaces an error state when the request fails", async () => {
    vi.mocked(authApi.getSessions).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe("useRevokeSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userId: "user-1" });
  });

  it("calls authApi.revokeSession with the given sessionId", async () => {
    vi.mocked(authApi.revokeSession).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRevokeSession(), { wrapper: createWrapper() });

    await result.current.mutateAsync("session-1");

    expect(authApi.revokeSession).toHaveBeenCalledWith("session-1");
  });

  it("invalidates the sessions query on success", async () => {
    vi.mocked(authApi.getSessions).mockResolvedValue([]);
    vi.mocked(authApi.revokeSession).mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRevokeSession(), { wrapper });

    await result.current.mutateAsync("session-1");

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["auth-sessions", "user-1"] });
    });
  });

  it("propagates errors from the API so callers can handle them", async () => {
    vi.mocked(authApi.revokeSession).mockRejectedValue(new Error("cannot revoke"));

    const { result } = renderHook(() => useRevokeSession(), { wrapper: createWrapper() });

    await expect(result.current.mutateAsync("session-1")).rejects.toThrow("cannot revoke");
  });
});

describe("useAccessHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userId: "user-1" });
  });

  it("fetches access history for the current user", async () => {
    const events: AccessEvent[] = [
      {
        type: "login",
        ipAddress: "127.0.0.1",
        time: "2026-09-01T00:00:00.000Z",
        error: null,
        details: {},
      },
    ];
    vi.mocked(authApi.getAccessHistory).mockResolvedValue(events);

    const { result } = renderHook(() => useAccessHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(events);
  });

  it("does not fetch when there is no authenticated userId", () => {
    mockUseAuth.mockReturnValue({ userId: null });

    const { result } = renderHook(() => useAccessHistory(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe("idle");
    expect(authApi.getAccessHistory).not.toHaveBeenCalled();
  });

  it("surfaces an error state when the request fails", async () => {
    vi.mocked(authApi.getAccessHistory).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAccessHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe("transfer mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userId: "user-1" });
  });

  // A transfer moves money between accounts, objectives and credit cards
  // (liabilities): every balance it touches must be refetched.
  it.each([
    ["useCreateTransfer", () => useCreateTransfer(), { source_account_id: 1, amount: 1 }],
    ["useUpdateTransfer", () => useUpdateTransfer(), { id: "1", dto: {} }],
    ["useDeleteTransfer", () => useDeleteTransfer(), "1"],
    ["useCloneTransfer", () => useCloneTransfer(), { id: 1 }],
  ] as const)("%s invalidates every balance a transfer touches", async (_name, hook, vars) => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(hook, { wrapper });

    await (result.current.mutateAsync as (v: unknown) => Promise<unknown>)(vars);

    await waitFor(() => {
      const keys = invalidateSpy.mock.calls.map(([f]) => JSON.stringify(f?.queryKey));
      for (const key of [
        ["transfers"],
        ["transactions", "user-1", {}],
        ["transaction-summary", "user-1"],
        ["bank-accounts", "user-1"],
        ["objectives", "user-1"],
        ["financial-liabilities", "user-1"],
      ]) {
        expect(keys).toContain(JSON.stringify(key));
      }
    });
  });
});
