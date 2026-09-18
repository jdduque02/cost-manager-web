import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";
import type { Session, AccessEvent } from "@/lib/api/auth";

const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUpdateUserMutateAsync = vi.fn();
const mockRevokeSessionMutateAsync = vi.fn();
let mockSessions: { data: Session[] | undefined; isLoading: boolean; error: unknown };
let mockHistory: { data: AccessEvent[] | undefined; isLoading: boolean; error: unknown };

vi.mock("@/lib/hooks/use-api", () => ({
  useFinancialBudgetProfile: () => ({ data: null, isLoading: false, error: null }),
  useCreateFinancialBudgetProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateFinancialBudgetProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateUser: () => ({ mutateAsync: mockUpdateUserMutateAsync, isPending: false }),
  useSessions: () => mockSessions,
  useRevokeSession: () => ({ mutateAsync: mockRevokeSessionMutateAsync, isPending: false }),
  useAccessHistory: () => mockHistory,
}));

vi.mock("@/lib/api/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/auth")>("@/lib/api/auth");
  return {
    ...actual,
    authApi: { changePassword: vi.fn() },
  };
});

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

function setup() {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(<Settings />);
  return { user };
}

async function goToTab(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("button", { name: label }));
}

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", username: "juan", email: "juan@test.com", metadata: {} },
      userId: "user-1",
      refreshUser: vi.fn().mockResolvedValue(undefined),
    });
    mockSessions = { data: [], isLoading: false, error: null };
    mockHistory = { data: [], isLoading: false, error: null };
  });

  describe("security tab — sessions", () => {
    it("shows a loading state while sessions are being fetched", async () => {
      mockSessions = { data: undefined, isLoading: true, error: null };
      const { user } = setup();
      await goToTab(user, "Seguridad");
      expect(screen.getByText("Sesiones activas")).toBeInTheDocument();
      // Loader is rendered instead of the empty/list state
      expect(screen.queryByText("No hay sesiones activas.")).not.toBeInTheDocument();
    });

    it("renders the list of active sessions with their data", async () => {
      mockSessions = {
        data: [
          {
            id: "session-1",
            ipAddress: "127.0.0.1",
            browser: "Chrome",
            start: "2026-09-01T00:00:00.000Z",
            lastAccess: "2026-09-02T00:00:00.000Z",
          },
        ],
        isLoading: false,
        error: null,
      };
      const { user } = setup();
      await goToTab(user, "Seguridad");

      expect(screen.getByText("Chrome")).toBeInTheDocument();
      expect(screen.getByText(/127\.0\.0\.1/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Revocar" })).toBeInTheDocument();
    });

    it("shows an empty state message when there are no active sessions", async () => {
      const { user } = setup();
      await goToTab(user, "Seguridad");
      expect(screen.getByText("No hay sesiones activas.")).toBeInTheDocument();
    });

    it("shows an error message when sessions fail to load", async () => {
      mockSessions = { data: undefined, isLoading: false, error: new Error("boom") };
      const { user } = setup();
      await goToTab(user, "Seguridad");
      expect(screen.getByText("No se pudieron cargar las sesiones.")).toBeInTheDocument();
    });

    it("opens a confirmation dialog when clicking Revocar and calls the mutation on confirm", async () => {
      mockSessions = {
        data: [
          {
            id: "session-1",
            ipAddress: "127.0.0.1",
            browser: "Chrome",
            start: "2026-09-01T00:00:00.000Z",
            lastAccess: null,
          },
        ],
        isLoading: false,
        error: null,
      };
      mockRevokeSessionMutateAsync.mockResolvedValue(undefined);
      const { user } = setup();
      await goToTab(user, "Seguridad");

      await user.click(screen.getByRole("button", { name: "Revocar" }));

      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent("Revocar sesion");
      expect(dialog).toHaveTextContent("Chrome");

      await user.click(within(dialog).getByRole("button", { name: "Revocar" }));

      await waitFor(() => {
        expect(mockRevokeSessionMutateAsync).toHaveBeenCalledWith("session-1");
      });
      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    });

    it("revokes the specific session whose row was clicked, not always the first one", async () => {
      mockSessions = {
        data: [
          {
            id: "session-1",
            ipAddress: "127.0.0.1",
            browser: "Chrome",
            start: "2026-09-01T00:00:00.000Z",
            lastAccess: null,
          },
          {
            id: "session-2",
            ipAddress: "10.0.0.9",
            browser: "Firefox",
            start: "2026-09-01T00:00:00.000Z",
            lastAccess: null,
          },
        ],
        isLoading: false,
        error: null,
      };
      mockRevokeSessionMutateAsync.mockResolvedValue(undefined);
      const { user } = setup();
      await goToTab(user, "Seguridad");

      const revokeButtons = screen.getAllByRole("button", { name: "Revocar" });
      expect(revokeButtons).toHaveLength(2);
      await user.click(revokeButtons[1]); // Firefox row (session-2)

      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent("Firefox");
      expect(dialog).not.toHaveTextContent('Esto cerrara la sesion en "Chrome"');

      await user.click(within(dialog).getByRole("button", { name: "Revocar" }));

      await waitFor(() => {
        expect(mockRevokeSessionMutateAsync).toHaveBeenCalledWith("session-2");
      });
      expect(mockRevokeSessionMutateAsync).not.toHaveBeenCalledWith("session-1");
    });

    it("shows an error toast when revoking a session fails", async () => {
      mockSessions = {
        data: [
          {
            id: "session-1",
            ipAddress: "127.0.0.1",
            browser: "Chrome",
            start: "2026-09-01T00:00:00.000Z",
            lastAccess: null,
          },
        ],
        isLoading: false,
        error: null,
      };
      mockRevokeSessionMutateAsync.mockRejectedValue(new Error("No se pudo revocar la sesion"));
      const { user } = setup();
      await goToTab(user, "Seguridad");

      await user.click(screen.getByRole("button", { name: "Revocar" }));
      const dialog = await screen.findByRole("alertdialog");
      const confirmButton = within(dialog).getByRole("button", { name: "Revocar" });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith("No se pudo revocar la sesion");
      });
    });
  });

  describe("security tab — access history", () => {
    it("shows an error message when access history fails to load", async () => {
      mockHistory = { data: undefined, isLoading: false, error: new Error("boom") };
      const { user } = setup();
      await goToTab(user, "Seguridad");
      expect(screen.getByText("No se pudo cargar el historial de accesos.")).toBeInTheDocument();
    });

    it("renders access history events with success and error indicators", async () => {
      mockHistory = {
        data: [
          {
            type: "login",
            ipAddress: "127.0.0.1",
            time: "2026-09-01T00:00:00.000Z",
            error: null,
            details: {},
          },
          {
            type: "login_failed",
            ipAddress: "10.0.0.9",
            time: "2026-09-02T00:00:00.000Z",
            error: "Contraseña incorrecta",
            details: {},
          },
        ],
        isLoading: false,
        error: null,
      };
      const { user } = setup();
      await goToTab(user, "Seguridad");

      expect(screen.getByText("Exitoso")).toBeInTheDocument();
      expect(screen.getByText("Contraseña incorrecta")).toBeInTheDocument();
    });
  });

  describe("security tab — 2FA", () => {
    it("shows 'Proximamente' for 2FA and does not render an interactive toggle", async () => {
      const { user } = setup();
      await goToTab(user, "Seguridad");

      expect(screen.getByText("Proximamente")).toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    });
  });

  describe("notifications tab", () => {
    it("reflects the user's stored notification preferences", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          username: "juan",
          email: "juan@test.com",
          metadata: { notifications: { email: false, push: true, budget: false } },
        },
        userId: "user-1",
        refreshUser: vi.fn().mockResolvedValue(undefined),
      });
      const { user } = setup();
      await goToTab(user, "Notificaciones");

      const switches = screen.getAllByRole("switch");
      expect(switches[0]).toHaveAttribute("aria-checked", "false"); // email
      expect(switches[1]).toHaveAttribute("aria-checked", "true"); // push
      expect(switches[2]).toHaveAttribute("aria-checked", "false"); // budget
    });

    it("defaults all toggles to on when the user has no stored preferences", async () => {
      const { user } = setup();
      await goToTab(user, "Notificaciones");

      const switches = screen.getAllByRole("switch");
      switches.forEach((s) => expect(s).toHaveAttribute("aria-checked", "true"));
    });

    it("persists a toggle change via useUpdateUser and shows a success toast", async () => {
      mockUpdateUserMutateAsync.mockResolvedValue(undefined);
      const { user } = setup();
      await goToTab(user, "Notificaciones");

      const [emailSwitch] = screen.getAllByRole("switch");
      await user.click(emailSwitch);

      await waitFor(() => {
        expect(mockUpdateUserMutateAsync).toHaveBeenCalledWith({
          metadata: { notifications: { email: false, push: true, budget: true } },
        });
      });
      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    });

    it("shows an error toast and reverts the toggle when persisting fails", async () => {
      mockUpdateUserMutateAsync.mockRejectedValue(new Error("No se pudo guardar"));
      const { user } = setup();
      await goToTab(user, "Notificaciones");

      const [emailSwitch] = screen.getAllByRole("switch");
      await user.click(emailSwitch);

      await waitFor(() => expect(toastError).toHaveBeenCalledWith("No se pudo guardar"));
      await waitFor(() => expect(emailSwitch).toHaveAttribute("aria-checked", "true"));
    });
  });
});

describe("billing tab content", () => {
  it("shows the honest placeholder instead of fake plan/pricing/card data", async () => {
    const { user } = setup();

    await goToTab(user, "Facturacion");

    expect(
      screen.getByText("Todavia no hay un plan de facturacion disponible en Sprig."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mindful Spend Mate Pro")).not.toBeInTheDocument();
    expect(screen.queryByText(/\$9\.99/)).not.toBeInTheDocument();
    expect(screen.queryByText(/termina.*en\s*4242/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Premium activo")).not.toBeInTheDocument();
  });
});
