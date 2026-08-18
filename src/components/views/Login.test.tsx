import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Login } from "./Login";
import { AuthProvider } from "@/lib/auth/context";
import { clearTokens } from "@/lib/api/client";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn() }),
  Link: ({ children, to, ...props }: Record<string, unknown>) => (
    <a href={to as string} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div />,
}));

vi.mock("@/components/brand/sprig-isotipo", () => ({
  SprigIsotipo: ({ className }: { className?: string }) => <svg className={className} />,
}));

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
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    encryptPassword: vi.fn().mockResolvedValue("encrypted"),
  },
}));

vi.mock("@/lib/api/identity", () => ({
  identityApi: {
    getUser: vi.fn().mockResolvedValue(null),
  },
}));

import { authApi } from "@/lib/api/auth";

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Login", () => {
  beforeEach(() => {
    clearTokens();
    vi.clearAllMocks();
  });

  it("renders the login form", () => {
    renderLogin();
    expect(screen.getByText("Bienvenido de nuevo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("juan_perez")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it("renders link to register", () => {
    renderLogin();
    expect(screen.getByText("Registrate aqui")).toHaveAttribute("href", "/register");
  });

  it("renders link to forgot password", () => {
    renderLogin();
    expect(screen.getByText("¿Olvidaste?")).toHaveAttribute("href", "/forgot-password");
  });

  it("shows error when submitting empty fields", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    expect(screen.getByText("Por favor ingresa el usuario y contraseña")).toBeInTheDocument();
  });

  it("calls login API on valid submit", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      userId: 1,
    });
    renderLogin();

    await user.type(screen.getByPlaceholderText("juan_perez"), "testuser");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({ username: "testuser", password: "password123" });
    });
  });

  it("shows error message on login failure", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockRejectedValue(new Error("Invalid credentials"));
    renderLogin();

    await user.type(screen.getByPlaceholderText("juan_perez"), "wronguser");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText("Credenciales inválidas o error del servidor")).toBeInTheDocument();
    });
  });

  it("disables form elements while loading", async () => {
    const user = userEvent.setup();
    let resolveLogin!: (v: unknown) => void;
    vi.mocked(authApi.login).mockImplementation(
      () =>
        new Promise((r) => {
          resolveLogin = r;
        }),
    );
    renderLogin();

    await user.type(screen.getByPlaceholderText("juan_perez"), "testuser");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("juan_perez")).toBeDisabled();
    });
    resolveLogin({ accessToken: "t", userId: 1 });
  });
});
