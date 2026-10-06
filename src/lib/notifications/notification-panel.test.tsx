import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "@/components/ui/notification-bell";
import { parseRecurringReference } from "./notification-panel";
import { resolveNotification } from "./format";

const navigate = vi.hoisted(() => vi.fn());
const markRead = vi.hoisted(() => vi.fn());
const notification = vi.hoisted(() => ({
  id: 1,
  user_id: 1,
  title: "Pago por validar",
  description: "Arriendo",
  is_read: false,
  is_active: true,
  reference: "recurring:validate:42",
  created_at: new Date().toISOString(),
}));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("@/lib/notifications/context", () => ({
  useNotifications: () => ({
    notifications: [notification],
    unreadCount: 1,
    markRead,
    markAllRead: vi.fn(),
    loading: false,
  }),
}));

describe("parseRecurringReference", () => {
  it.each([
    ["recurring:validate:42", { to: "/transactions", search: { validate: 42 } }],
    ["recurring:created:42", { to: "/transactions" }],
    ["recurring:not-adopted:42", { to: "/transactions" }],
    ["recurring:finished:7", { to: "/recurring" }],
    ["recurring:adopted:7", { to: "/recurring" }],
    ["recurring:reminder:7:2026-10-05", { to: "/recurring" }],
    ["recurring:insufficient:7:2026-10-05", { to: "/recurring" }],
    ["recurring:skipped:7:2026-10-05", { to: "/recurring" }],
    ["recurring:validate:abc", { to: "/transactions" }],
  ])("%s", (ref, expected) => expect(parseRecurringReference(ref)).toEqual(expected));

  it("ignora otras referencias", () => {
    expect(parseRecurringReference("statement-import:3")).toBeNull();
    expect(parseRecurringReference(null)).toBeNull();
  });

  it("las notificaciones recurring:* no caen en system", () => {
    expect(
      resolveNotification({
        title: "x",
        description: null,
        reference: "recurring:skipped:7:2026-10-05",
      }).kind,
    ).toBe("recurring");
  });
});

describe("NotificationBell con recurrentes", () => {
  it("recurring:validate:42 navega a /transactions?validate=42", async () => {
    render(<NotificationBell />);
    await userEvent.click(screen.getByLabelText("Notificaciones"));
    await userEvent.click(await screen.findByText("Pago por validar"));
    expect(markRead).toHaveBeenCalledWith(1);
    expect(navigate).toHaveBeenCalledWith({ to: "/transactions", search: { validate: 42 } });
  });
});
