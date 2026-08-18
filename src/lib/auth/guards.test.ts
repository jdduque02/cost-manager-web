import { requireAuth, redirectIfAuthenticated } from "./guards";
import { setTokens, clearTokens } from "@/lib/api/client";

vi.mock("@tanstack/react-router", () => ({
  redirect: (opts: { to: string }) => {
    const error = new Error(`Redirect to ${opts.to}`);
    Object.assign(error, { redirect: opts });
    throw error;
  },
}));

describe("requireAuth", () => {
  beforeEach(() => {
    clearTokens();
  });

  it("does not throw when token exists", () => {
    setTokens("valid-token");
    expect(() => requireAuth()).not.toThrow();
  });

  it("throws redirect to /login when no token", () => {
    expect(() => requireAuth()).toThrow();
    try {
      requireAuth();
    } catch (e: unknown) {
      expect((e as { redirect: { to: string } }).redirect).toEqual({ to: "/login" });
    }
  });
});

describe("redirectIfAuthenticated", () => {
  beforeEach(() => {
    clearTokens();
  });

  it("throws redirect to /dashboard when token exists", () => {
    setTokens("valid-token");
    expect(() => redirectIfAuthenticated()).toThrow();
    try {
      redirectIfAuthenticated();
    } catch (e: unknown) {
      expect((e as { redirect: { to: string } }).redirect).toEqual({ to: "/dashboard" });
    }
  });

  it("does not throw when no token", () => {
    expect(() => redirectIfAuthenticated()).not.toThrow();
  });
});
