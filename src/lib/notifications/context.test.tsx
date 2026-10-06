import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationProvider } from "./context";

const calls = vi.hoisted(() => [] as string[]);
const process = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ userId: "u1", isAuthenticated: true }) }));
vi.mock("@/lib/api/finance", () => ({ recurringApi: { process } }));
vi.mock("@/lib/api/notifications", () => ({
  notificationsApi: {
    getNotifications: vi.fn(async () => {
      calls.push("notifications");
      return [];
    }),
  },
}));
vi.mock("@/lib/socket", () => ({
  connectSocket: () => ({ on: vi.fn(), off: vi.fn() }),
  disconnectSocket: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  NOTIFICATION_EVENTS: {},
}));

const tree = (client: QueryClient) => (
  <QueryClientProvider client={client}>
    <NotificationProvider>
      <span />
    </NotificationProvider>
  </QueryClientProvider>
);

describe("NotificationProvider: process de recurrentes", () => {
  beforeEach(() => {
    calls.length = 0;
    process.mockReset().mockImplementation(async () => {
      calls.push("process");
      return { created: 0, reminders: 0, adopted: 0 };
    });
  });

  it("llama process una sola vez y antes de pedir notificaciones", async () => {
    const client = new QueryClient();
    const { rerender } = render(tree(client));
    await waitFor(() => expect(calls).toEqual(["process", "notifications"]));
    rerender(tree(client));
    expect(process).toHaveBeenCalledTimes(1);
  });

  it("invalida transacciones y cuentas si se creó o adoptó algo", async () => {
    process.mockResolvedValue({ created: 2, reminders: 0, adopted: 0 });
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    render(tree(client));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["transactions", "u1"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["bank-accounts", "u1"] });
  });

  it("un fallo de process no bloquea las notificaciones", async () => {
    process.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(tree(new QueryClient()));
    await waitFor(() => expect(calls).toContain("notifications"));
  });
});
