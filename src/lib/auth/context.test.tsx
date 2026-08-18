import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./context";
import { useAuth } from "./useAuth";
import { clearTokens } from "@/lib/api/client";

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual("@/lib/api/client");
  return {
    ...actual,
    tryRestoreSession: vi.fn().mockResolvedValue(false),
    getAccessToken: vi.fn().mockReturnValue(null),
    getStoredUserId: vi.fn().mockReturnValue(null),
  };
});

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({
      accessToken: "new-token",
      refreshToken: "refresh",
      userId: "user-1",
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    forgotPassword: vi.fn().mockResolvedValue({ message: "sent" }),
    verifyOtp: vi.fn().mockResolvedValue({ reset_token: "reset-tok", expires_in_seconds: 600 }),
    resetPassword: vi.fn().mockResolvedValue({ message: "ok" }),
    encryptPassword: vi.fn().mockResolvedValue("encrypted"),
  },
}));

vi.mock("@/lib/api/identity", () => ({
  identityApi: {
    getUser: vi.fn().mockResolvedValue({
      id: "user-1",
      username: "testuser",
      email: "test@example.com",
      roles: ["user"],
      is_active: true,
      created_at: "2024-01-01",
      updated_at: null,
    }),
  },
}));

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="is-loading">{String(auth.isLoading)}</span>
      <span data-testid="is-authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user-id">{auth.userId ?? "null"}</span>
      <span data-testid="is-admin">{String(auth.isAdmin)}</span>
      <span data-testid="roles">{JSON.stringify(auth.roles)}</span>
      <button onClick={() => auth.login("user", "pass")}>login</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

function renderAuth(consumer = <TestConsumer />) {
  return render(<AuthProvider>{consumer}</AuthProvider>);
}

describe("AuthProvider", () => {
  beforeEach(() => {
    clearTokens();
    vi.clearAllMocks();
  });

  it("renders children and starts with isLoading=true", () => {
    renderAuth();
    expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
  });

  it("finishes loading with isAuthenticated=false when no session", async () => {
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("user-id")).toHaveTextContent("null");
  });

  it("login sets authenticated state", async () => {
    const user = userEvent.setup();
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    });

    await user.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("user-id")).toHaveTextContent("user-1");
  });

  it("logout clears authenticated state", async () => {
    const user = userEvent.setup();
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    });

    await user.click(screen.getByText("login"));
    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByText("logout"));
    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
    });
  });

  it("isAdmin reflects user roles", async () => {
    const { identityApi } = await import("@/lib/api/identity");
    vi.mocked(identityApi.getUser).mockResolvedValueOnce({
      id: "admin-1",
      username: "admin",
      email: "admin@example.com",
      roles: ["admin", "user"],
      is_active: true,
      created_at: "2024-01-01",
      updated_at: null,
    });

    const user = userEvent.setup();
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    });

    await user.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("roles")).toHaveTextContent('["admin","user"]');
  });
});
