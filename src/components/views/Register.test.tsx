import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Register } from "./Register";
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
    api: { post: vi.fn() },
    tryRestoreSession: vi.fn().mockResolvedValue(false),
    getAccessToken: vi.fn().mockReturnValue(null),
    getStoredUserId: vi.fn().mockReturnValue(null),
  };
});

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/api/identity", () => ({
  identityApi: { getUser: vi.fn().mockResolvedValue(null) },
}));

import { api } from "@/lib/api/client";

function renderRegister() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Register", () => {
  beforeEach(() => {
    clearTokens();
    vi.clearAllMocks();
  });

  it("renders the registration form with all fields", () => {
    renderRegister();
    expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Juan Perez Garcia")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("juan_perez")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("juan@ejemplo.com")).toBeInTheDocument();
  });

  it("shows password validation hints", () => {
    renderRegister();
    expect(screen.getByText("Minimo 8 caracteres")).toBeInTheDocument();
    expect(screen.getByText("2 mayusculas")).toBeInTheDocument();
    expect(screen.getByText("2 minusculas")).toBeInTheDocument();
    expect(screen.getByText("2 numeros")).toBeInTheDocument();
    expect(screen.getByText("1 caracter especial")).toBeInTheDocument();
  });

  it("shows error when required fields are empty", async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(
      screen.getByText("Por favor completa todos los campos obligatorios"),
    ).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText("Juan Perez Garcia"), "Juan Perez");
    await user.type(screen.getByPlaceholderText("juan_perez"), "juan");
    await user.type(screen.getByPlaceholderText("juan@ejemplo.com"), "juan@test.com");
    await user.type(screen.getByPlaceholderText("Minimo 8 caracteres"), "TestPass123!");
    await user.type(screen.getByPlaceholderText("Repite tu contrasena"), "Different123!");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(screen.getByText("Las contrasenas no coinciden")).toBeInTheDocument();
  });

  it("shows error when password is weak", async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText("Juan Perez Garcia"), "Juan Perez");
    await user.type(screen.getByPlaceholderText("juan_perez"), "juan");
    await user.type(screen.getByPlaceholderText("juan@ejemplo.com"), "juan@test.com");
    await user.type(screen.getByPlaceholderText("Minimo 8 caracteres"), "weak");
    await user.type(screen.getByPlaceholderText("Repite tu contrasena"), "weak");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(screen.getByText("La contrasena no cumple con los requisitos")).toBeInTheDocument();
  });

  it("submits successfully with valid data", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      id: "1",
      external_id: "ext-1",
      username: "juan",
      email: "juan@test.com",
    });
    renderRegister();

    await user.type(screen.getByPlaceholderText("Juan Perez Garcia"), "Juan Perez");
    await user.type(screen.getByPlaceholderText("juan_perez"), "juan");
    await user.type(screen.getByPlaceholderText("juan@ejemplo.com"), "juan@test.com");
    await user.type(screen.getByPlaceholderText("Minimo 8 caracteres"), "TestPass123!");
    await user.type(screen.getByPlaceholderText("Repite tu contrasena"), "TestPass123!");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText("Cuenta creada")).toBeInTheDocument();
    });
  });

  it("renders link to login", () => {
    renderRegister();
    expect(screen.getByText("Iniciar sesion")).toHaveAttribute("href", "/login");
  });
});
