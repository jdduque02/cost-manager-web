import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResetPassword } from "./ResetPassword";
import { AuthProvider } from "@/lib/auth/context";
import { clearTokens } from "@/lib/api/client";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn() }),
  useSearch: () => ({ email: "test@example.com" }),
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
    verifyOtp: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock("@/lib/api/identity", () => ({
  identityApi: { getUser: vi.fn().mockResolvedValue(null) },
}));

import { authApi } from "@/lib/api/auth";

function renderReset() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ResetPassword />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("ResetPassword", () => {
  beforeEach(() => {
    clearTokens();
    vi.clearAllMocks();
  });

  it("renders OTP verification heading", () => {
    renderReset();
    expect(screen.getByRole("heading", { name: "Verificar código" })).toBeInTheDocument();
  });

  it("renders OTP input and button", () => {
    renderReset();
    expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verificar código/i })).toBeInTheDocument();
  });

  it("renders back to login link", () => {
    renderReset();
    expect(screen.getByText("Volver al inicio de sesión")).toHaveAttribute("href", "/login");
  });

  it("shows error for invalid OTP code length", async () => {
    const user = userEvent.setup();
    renderReset();
    await user.type(screen.getByPlaceholderText("000000"), "123");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));
    expect(screen.getByText("Ingresa el código de 6 dígitos")).toBeInTheDocument();
  });

  it("calls verifyOtp API with valid code", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.verifyOtp).mockResolvedValue({
      reset_token: "reset-tok-123",
      expires_in_seconds: 600,
    });
    renderReset();

    await user.type(screen.getByPlaceholderText("000000"), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    await waitFor(() => {
      expect(authApi.verifyOtp).toHaveBeenCalledWith("test@example.com", "123456");
    });
  });

  it("moves to password step after OTP verification", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.verifyOtp).mockResolvedValue({
      reset_token: "reset-tok",
      expires_in_seconds: 600,
    });
    renderReset();

    await user.type(screen.getByPlaceholderText("000000"), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Nueva contraseña" })).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Mínimo 8 caracteres")).toBeInTheDocument();
  });

  it("shows error when OTP verification fails", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.verifyOtp).mockRejectedValue(new Error("Invalid code"));
    renderReset();

    await user.type(screen.getByPlaceholderText("000000"), "000000");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    await waitFor(() => {
      expect(screen.getByText("Código inválido o expirado. Intenta de nuevo.")).toBeInTheDocument();
    });
  });

  it("validates password step fields", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.verifyOtp).mockResolvedValue({ reset_token: "tok", expires_in_seconds: 600 });
    renderReset();

    await user.type(screen.getByPlaceholderText("000000"), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Nueva contraseña" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /restablecer contraseña/i }));
    expect(screen.getByText("Ingresa la nueva contraseña")).toBeInTheDocument();
  });
});
