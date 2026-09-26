import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentDialog } from "./ConsentDialog";
import { LEGAL_VERSION } from "@/content/legal";
import { ApiError } from "@/lib/api/client";
import { setLocale } from "@/lib/i18n/errors";

const logout = vi.fn();
const updateUser = vi.fn();
const navigate = vi.fn();
let user: { id: string; terms_version?: string | null } | null;

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user, logout, updateUser }),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("@/lib/api/identity", () => ({ identityApi: { acceptTerms: vi.fn() } }));

async function acceptTermsMock() {
  return vi.mocked((await import("@/lib/api/identity")).identityApi.acceptTerms);
}

beforeEach(() => {
  setLocale("es");
  vi.clearAllMocks();
  user = { id: "u1", terms_version: null };
  logout.mockResolvedValue(undefined);
});

describe("ConsentDialog", () => {
  it.each([null, "2020-01-01"])("abre con terms_version=%s", (v) => {
    user = { id: "u1", terms_version: v };
    render(<ConsentDialog />);
    expect(screen.getByRole("alertdialog", { name: /documentos legales/i })).toBeInTheDocument();
  });

  it("no abre si la versión coincide ni sin usuario", () => {
    user = { id: "u1", terms_version: LEGAL_VERSION };
    const { rerender } = render(<ConsentDialog />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    user = null;
    rerender(<ConsentDialog />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("muestra la versión y enlaza a los tres documentos", () => {
    render(<ConsentDialog />);
    expect(screen.getAllByText(new RegExp(LEGAL_VERSION)).length).toBeGreaterThan(0);
    for (const href of ["/terminos", "/privacidad", "/cookies"]) {
      expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it("deshabilita Aceptar hasta marcar la casilla", async () => {
    const u = userEvent.setup();
    render(<ConsentDialog />);
    const accept = screen.getByRole("button", { name: /aceptar y continuar/i });
    expect(accept).toBeDisabled();
    await u.click(screen.getByRole("checkbox"));
    expect(accept).toBeEnabled();
  });

  it("Escape no lo cierra", async () => {
    const u = userEvent.setup();
    render(<ConsentDialog />);
    await u.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("acepta: envía la versión vigente y usa el usuario devuelto, sin otra petición", async () => {
    const accept = await acceptTermsMock();
    const updated = { id: "u1", terms_version: LEGAL_VERSION };
    accept.mockResolvedValue(updated as never);
    const u = userEvent.setup();
    render(<ConsentDialog />);
    await u.click(screen.getByRole("checkbox"));
    await u.click(screen.getByRole("button", { name: /aceptar y continuar/i }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(updated));
    expect(accept).toHaveBeenCalledTimes(1);
    expect(accept).toHaveBeenCalledWith("u1", LEGAL_VERSION);
  });

  it("si falla el guardado muestra el error y sigue abierto", async () => {
    const accept = await acceptTermsMock();
    accept.mockRejectedValue(new ApiError("Sin conexión con el servidor. Revisa tu internet.", 0));
    const u = userEvent.setup();
    render(<ConsentDialog />);
    await u.click(screen.getByRole("checkbox"));
    await u.click(screen.getByRole("button", { name: /aceptar y continuar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/sin conexión/i);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("si el guardado falla con un error no controlado, mensaje genérico traducido y sigue abierto", async () => {
    const accept = await acceptTermsMock();
    accept.mockRejectedValue(new Error("boom"));
    const u = userEvent.setup();
    render(<ConsentDialog />);
    await u.click(screen.getByRole("checkbox"));
    await u.click(screen.getByRole("button", { name: /aceptar y continuar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo guardar/i);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("No acepto cierra sesión y va a /login", async () => {
    const u = userEvent.setup();
    render(<ConsentDialog />);
    await u.click(screen.getByRole("button", { name: /no acepto/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/login" }));
    expect(logout).toHaveBeenCalled();
  });
});
