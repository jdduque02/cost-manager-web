import { requireAuth, redirectIfAuthenticated, safeRedirect, loginHref } from "./guards";
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

  const ctx = { location: { href: "/goals?goal=3" } };

  it("does not throw when token exists", () => {
    setTokens("valid-token");
    expect(() => requireAuth(ctx)).not.toThrow();
  });

  it("throws redirect to /login carrying the requested route when no token", () => {
    expect(() => requireAuth(ctx)).toThrow();
    try {
      requireAuth(ctx);
    } catch (e: unknown) {
      expect((e as { redirect: { href: string } }).redirect).toEqual({
        href: "/login?redirect=%2Fgoals%3Fgoal%3D3",
      });
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

describe("safeRedirect", () => {
  it.each(["/transactions", "/goals?goal=3", "/transactions?from=2026-01-01#x"])(
    "keeps internal path %s",
    (path) => {
      expect(safeRedirect(path)).toBe(path);
    },
  );

  it.each([
    null,
    undefined,
    "",
    "transactions",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/foo bar",
    "https://evil.com",
    "javascript:alert(1)",
  ])("falls back to /dashboard for %j", (value) => {
    expect(safeRedirect(value)).toBe("/dashboard");
  });

  it("round-trips through loginHref", () => {
    const href = loginHref("/goals?goal=3");
    expect(href).toBe("/login?redirect=%2Fgoals%3Fgoal%3D3");
    expect(safeRedirect(new URLSearchParams(href.split("?")[1]).get("redirect"))).toBe(
      "/goals?goal=3",
    );
  });
});
