import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Register } from "./Register";
import { AuthProvider } from "@/lib/auth/context";
import { clearTokens } from "@/lib/api/client";
import { setLocale } from "@/lib/i18n/errors";

// jsdom reports navigator.language=en-US; these tests assert Spanish copy.
beforeAll(() => setLocale("es"));

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
  },
}));

vi.mock("@/lib/api/identity", () => ({
  identityApi: { getUser: vi.fn().mockResolvedValue(null), createUser: vi.fn() },
}));

import { identityApi } from "@/lib/api/identity";

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
    expect(screen.getByText("Minimo 12 caracteres")).toBeInTheDocument();
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
    await user.type(screen.getByPlaceholderText("Minimo 12 caracteres"), "TestPass123!");
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
    await user.type(screen.getByPlaceholderText("Minimo 12 caracteres"), "weak");
    await user.type(screen.getByPlaceholderText("Repite tu contrasena"), "weak");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(screen.getByText("La contrasena no cumple con los requisitos")).toBeInTheDocument();
  });

  it("submits successfully with valid data", async () => {
    const user = userEvent.setup();
    vi.mocked(identityApi.createUser).mockResolvedValue({
      id: "1",
      external_id: "ext-1",
      username: "juan",
      email: "juan@test.com",
    });
    renderRegister();

    await user.type(screen.getByPlaceholderText("Juan Perez Garcia"), "Juan Perez");
    await user.type(screen.getByPlaceholderText("juan_perez"), "juan");
    await user.type(screen.getByPlaceholderText("juan@ejemplo.com"), "juan@test.com");
    await user.type(screen.getByPlaceholderText("Minimo 12 caracteres"), "TestPass123!");
    await user.type(screen.getByPlaceholderText("Repite tu contrasena"), "TestPass123!");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText("Cuenta creada")).toBeInTheDocument();
    });
    expect(identityApi.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "juan",
        email: "juan@test.com",
        password: "TestPass123!",
        full_name: "Juan Perez",
        timezone: expect.any(String),
      }),
    );
  });

  it("sends phone in E.164 and address serialized", async () => {
    const user = userEvent.setup();
    vi.mocked(identityApi.createUser).mockResolvedValue({
      id: "1",
      external_id: "ext-1",
      username: "juan",
      email: "juan@test.com",
    });
    renderRegister();

    await user.type(screen.getByPlaceholderText("Juan Perez Garcia"), "Juan Perez");
    await user.type(screen.getByPlaceholderText("juan_perez"), "juan");
    await user.type(screen.getByPlaceholderText("juan@ejemplo.com"), "juan@test.com");
    await user.type(screen.getByLabelText("Telefono"), "3101234567");
    await user.type(screen.getByLabelText("Numero de via"), "97A");
    await user.type(screen.getByLabelText("Numero de cruce"), "76");
    await user.type(screen.getByLabelText("Numero de placa"), "5");
    await user.selectOptions(screen.getByLabelText("Departamento"), "Antioquia");
    await user.selectOptions(screen.getByLabelText("Ciudad"), "Medellín");
    await user.type(screen.getByPlaceholderText("Minimo 12 caracteres"), "TestPass123!");
    await user.type(screen.getByPlaceholderText("Repite tu contrasena"), "TestPass123!");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => expect(identityApi.createUser).toHaveBeenCalled());
    expect(identityApi.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "+573101234567",
        address: "Cl 97A # 76-5, Medellín, Antioquia",
      }),
    );
  });

  it("blocks submit with an invalid phone", async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText("Juan Perez Garcia"), "Juan Perez");
    await user.type(screen.getByPlaceholderText("juan_perez"), "juan");
    await user.type(screen.getByPlaceholderText("juan@ejemplo.com"), "juan@test.com");
    await user.type(screen.getByLabelText("Telefono"), "123");
    await user.type(screen.getByPlaceholderText("Minimo 12 caracteres"), "TestPass123!");
    await user.type(screen.getByPlaceholderText("Repite tu contrasena"), "TestPass123!");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(screen.getByText("Ingresa un numero de telefono valido")).toBeInTheDocument();
    expect(identityApi.createUser).not.toHaveBeenCalled();
  });

  it("renders link to login", () => {
    renderRegister();
    expect(screen.getByText("Iniciar sesion")).toHaveAttribute("href", "/login");
  });
});
