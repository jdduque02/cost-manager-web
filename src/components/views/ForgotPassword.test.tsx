import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ForgotPassword } from "./ForgotPassword";
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
    forgotPassword: vi.fn().mockResolvedValue({ message: "sent" }),
  },
}));

vi.mock("@/lib/api/identity", () => ({
  identityApi: { getUser: vi.fn().mockResolvedValue(null) },
}));

import { authApi } from "@/lib/api/auth";

function renderForgot() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ForgotPassword />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("ForgotPassword", () => {
  beforeEach(() => {
    clearTokens();
    vi.clearAllMocks();
  });

  it("renders the email form", () => {
    renderForgot();
    expect(screen.getByText("Recuperar contraseña")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("tu@correo.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar código/i })).toBeInTheDocument();
  });

  it("renders back to login link", () => {
    renderForgot();
    expect(screen.getByText("Volver al inicio de sesión")).toHaveAttribute("href", "/login");
  });

  it("shows error when email is empty", async () => {
    const user = userEvent.setup();
    renderForgot();
    await user.click(screen.getByRole("button", { name: /enviar código/i }));
    expect(screen.getByText("Por favor ingresa tu correo electrónico")).toBeInTheDocument();
  });

  it("calls forgotPassword API on valid submit", async () => {
    const user = userEvent.setup();
    renderForgot();
    await user.type(screen.getByPlaceholderText("tu@correo.com"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /enviar código/i }));
    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("shows success state after sending", async () => {
    const user = userEvent.setup();
    renderForgot();
    await user.type(screen.getByPlaceholderText("tu@correo.com"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /enviar código/i }));
    await waitFor(() => {
      expect(screen.getByText(/Código enviado a/)).toBeInTheDocument();
    });
  });

  it("shows error on API failure", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.forgotPassword).mockRejectedValue(new Error("Network error"));
    renderForgot();
    await user.type(screen.getByPlaceholderText("tu@correo.com"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /enviar código/i }));
    await waitFor(() => {
      expect(screen.getByText(/No se pudo enviar el código/)).toBeInTheDocument();
    });
  });
});
