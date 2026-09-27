import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminUsers } from "./AdminUsers";

const { mockUser, updateRolesMock, updateStatusMock, resetPasswordMock, revokeAllSessionsMock } =
  vi.hoisted(() => {
    const mockUser = {
      id: "u1",
      external_id: "ext-1",
      username: "jdoe",
      email: "jdoe@example.com",
      roles: ["user"],
      is_active: true,
      is_online: false,
      last_login_at: null,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: null,
    };
    return {
      mockUser,
      updateRolesMock: vi.fn().mockResolvedValue(mockUser),
      updateStatusMock: vi.fn().mockResolvedValue(mockUser),
      resetPasswordMock: vi.fn().mockResolvedValue({ message: "ok" }),
      revokeAllSessionsMock: vi.fn().mockResolvedValue({ message: "ok" }),
    };
  });

vi.mock("@/lib/api/admin", () => ({
  adminApi: {
    getUsers: vi.fn().mockResolvedValue({ data: [mockUser], total: 1 }),
    getUserDetail: vi.fn().mockResolvedValue({ user: mockUser, sessions: [], accessHistory: [] }),
    updateStatus: (...args: unknown[]) => updateStatusMock(...args),
    updateRoles: (...args: unknown[]) => updateRolesMock(...args),
    resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
    revokeAllSessions: (...args: unknown[]) => revokeAllSessionsMock(...args),
    revokeSession: vi.fn().mockResolvedValue({ message: "ok" }),
  },
}));

function renderAdminUsers() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AdminUsers />
    </QueryClientProvider>,
  );
}

async function openRowDropdown(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("jdoe");
  const menuTrigger = screen
    .getAllByRole("button")
    .find((b) => b.getAttribute("aria-haspopup") === "menu");
  if (!menuTrigger) throw new Error("Row dropdown trigger not found");
  await user.click(menuTrigger);
}

describe("AdminUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateRolesMock.mockResolvedValue(mockUser);
    updateStatusMock.mockResolvedValue(mockUser);
    resetPasswordMock.mockResolvedValue({ message: "ok" });
    revokeAllSessionsMock.mockResolvedValue({ message: "ok" });
  });

  it("opens a confirm dialog for 'Hacer admin' without mutating immediately", async () => {
    renderAdminUsers();
    const user = userEvent.setup();
    await openRowDropdown(user);

    await user.click(await screen.findByText("Hacer admin"));

    expect(await screen.findByText("Cambiar rol de administrador")).toBeInTheDocument();
    expect(updateRolesMock).not.toHaveBeenCalled();
  });

  it("does not mutate when the confirm dialog is cancelled", async () => {
    renderAdminUsers();
    const user = userEvent.setup();
    await openRowDropdown(user);

    await user.click(await screen.findByText("Hacer admin"));
    await screen.findByText("Cambiar rol de administrador");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(updateRolesMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Cambiar rol de administrador")).not.toBeInTheDocument();
  });

  it("mutates roles when the confirm dialog is confirmed", async () => {
    renderAdminUsers();
    const user = userEvent.setup();
    await openRowDropdown(user);

    await user.click(await screen.findByText("Hacer admin"));
    await screen.findByText("Cambiar rol de administrador");

    await user.click(screen.getByRole("button", { name: "Hacer admin" }));

    expect(updateRolesMock).toHaveBeenCalledWith("u1", ["user", "admin"]);
  });

  it("opens a confirm dialog for status changes without mutating immediately", async () => {
    renderAdminUsers();
    const user = userEvent.setup();
    await openRowDropdown(user);

    await user.click(await screen.findByText("Desactivar"));

    expect(await screen.findByText("Cambiar estado de la cuenta")).toBeInTheDocument();
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it("opens a confirm dialog for revoking sessions without mutating immediately", async () => {
    renderAdminUsers();
    const user = userEvent.setup();
    await openRowDropdown(user);

    await user.click(await screen.findByText("Revocar sesiones"));

    expect(
      await screen.findByText("¿Revocar todas las sesiones activas de jdoe?"),
    ).toBeInTheDocument();
    expect(revokeAllSessionsMock).not.toHaveBeenCalled();
  });
});
