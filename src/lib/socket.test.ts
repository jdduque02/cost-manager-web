import { describe, it, expect, vi, beforeEach } from "vitest";

const { ioMock, ensureFreshToken, getAccessToken } = vi.hoisted(() => ({
  ioMock: vi.fn(),
  ensureFreshToken: vi.fn<() => Promise<void>>(),
  getAccessToken: vi.fn<() => string | null>(),
}));

vi.mock("socket.io-client", () => ({ io: ioMock }));
vi.mock("@/lib/api/client", () => ({ ensureFreshToken, getAccessToken }));

type AuthFn = (cb: (data: object) => void) => void;

const fakeSocket = { on: vi.fn(), connected: false, connect: vi.fn(), disconnect: vi.fn() };

async function getAuthCallback(): Promise<AuthFn> {
  vi.resetModules();
  ioMock.mockReturnValue(fakeSocket);
  const { getSocket } = await import("./socket");
  getSocket();
  return ioMock.mock.calls[0][1].auth as AuthFn;
}

describe("socket auth callback", () => {
  beforeEach(() => {
    ioMock.mockReset();
    ensureFreshToken.mockReset();
    getAccessToken.mockReset();
    fakeSocket.connect.mockReset();
    fakeSocket.disconnect.mockReset();
  });

  it("espera a ensureFreshToken y entrega el token renovado", async () => {
    let token = "viejo";
    getAccessToken.mockImplementation(() => token);
    ensureFreshToken.mockImplementation(async () => {
      token = "nuevo";
    });
    const auth = await getAuthCallback();

    const data = await new Promise((resolve) => auth(resolve));

    expect(ensureFreshToken).toHaveBeenCalledOnce();
    expect(data).toEqual({ token: "nuevo" });
  });

  it("llama cb aunque ensureFreshToken rechace", async () => {
    getAccessToken.mockReturnValue("vigente");
    ensureFreshToken.mockRejectedValue(new Error("refresh caído"));
    const auth = await getAuthCallback();

    const data = await new Promise((resolve) => auth(resolve));

    expect(data).toEqual({ token: "vigente" });
  });

  it("el refresh durante el handshake no reconecta (sin bucle)", async () => {
    getAccessToken.mockReturnValue("nuevo");
    // Igual que setTokens(): el refresh emite cm:tokens-updated.
    ensureFreshToken.mockImplementation(async () => {
      window.dispatchEvent(new CustomEvent("cm:tokens-updated"));
    });
    const auth = await getAuthCallback();

    await new Promise((resolve) => auth(resolve));

    expect(fakeSocket.disconnect).not.toHaveBeenCalled();
    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });
});
