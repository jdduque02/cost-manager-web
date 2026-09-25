import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Register } from "./Register";
import { AuthProvider } from "@/lib/auth/context";
import { clearTokens } from "@/lib/api/client";
import { setLocale } from "@/lib/i18n/errors";
import { LEGAL_VERSION } from "@/content/legal";

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
    await user.click(screen.getByRole("checkbox", { name: /mayor de 18/i }));
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

  it("does not ask for document, phone or address", () => {
    renderRegister();
    expect(screen.queryByLabelText(/documento/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/telefono/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/departamento|ciudad|via/i)).not.toBeInTheDocument();
  });

  it("associates every field with its label", () => {
    renderRegister();
    for (const name of [
      "Nombre completo *",
      "Usuario *",
      "Correo electronico *",
      "Contrasena *",
      "Confirmar contrasena *",
    ]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  it("links the legal documents next to the consent checkbox", () => {
    renderRegister();
    expect(screen.getByRole("link", { name: /términos y condiciones/i })).toHaveAttribute(
      "href",
      "/terminos",
    );
    expect(screen.getByRole("link", { name: /política de privacidad/i })).toHaveAttribute(
      "href",
      "/privacidad",
    );
  });

  it("consent checkbox starts unchecked", () => {
    renderRegister();
    expect(screen.getByRole("checkbox", { name: /mayor de 18/i })).not.toBeChecked();
  });

  it("blocks submit without consent and announces the error", async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText("Juan Perez Garcia"), "Juan Perez");
    await user.type(screen.getByPlaceholderText("juan_perez"), "juan");
    await user.type(screen.getByPlaceholderText("juan@ejemplo.com"), "juan@test.com");
    await user.type(screen.getByPlaceholderText("Minimo 12 caracteres"), "TestPass123!");
    await user.type(screen.getByPlaceholderText("Repite tu contrasena"), "TestPass123!");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/debes aceptar los términos/i);
    expect(identityApi.createUser).not.toHaveBeenCalled();
  });

  it("sends the accepted terms version as proof of authorization", async () => {
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
    await user.click(screen.getByRole("checkbox", { name: /mayor de 18/i }));
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => expect(identityApi.createUser).toHaveBeenCalled());
    const dto = vi.mocked(identityApi.createUser).mock.calls[0][0];
    expect(dto.accepted_terms_version).toBe(LEGAL_VERSION);
    expect(dto).not.toHaveProperty("phone");
    expect(dto).not.toHaveProperty("address");
    expect(dto).not.toHaveProperty("document_id");
  });

  it("renders link to login", () => {
    renderRegister();
    expect(screen.getByText("Iniciar sesion")).toHaveAttribute("href", "/login");
  });
});
