import { authApi } from "./auth";
import { api, ensureCsrfToken, clearTokens } from "./client";

vi.mock("./client", async () => {
  const actual = await vi.importActual("./client");
  return {
    ...actual,
    ensureCsrfToken: vi.fn().mockResolvedValue("signed-token"),
    clearTokens: vi.fn(),
    api: {
      ...((await actual) as { api: Record<string, unknown> }).api,
      post: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe("authApi.logout", () => {
  it("ensures a CSRF token before calling auth/logout, then always clears tokens", async () => {
    const callOrder: string[] = [];
    vi.mocked(ensureCsrfToken).mockImplementation(async () => {
      callOrder.push("ensureCsrfToken");
      return "signed-token";
    });
    vi.mocked(api.post).mockImplementation(async () => {
      callOrder.push("post");
    });

    await authApi.logout();

    expect(callOrder).toEqual(["ensureCsrfToken", "post"]);
    expect(api.post).toHaveBeenCalledWith("auth/logout", {});
    expect(clearTokens).toHaveBeenCalled();
  });

  it("still clears tokens even if the logout request fails", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error("network error"));

    await expect(authApi.logout()).rejects.toThrow("network error");
    expect(clearTokens).toHaveBeenCalled();
  });
});
