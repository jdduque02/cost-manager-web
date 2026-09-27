import { test as base, type Page, type Route } from "@playwright/test";
import { AuthHelper } from "../helpers/auth";
import { NavHelper } from "../helpers/navigation";
import { LEGAL_VERSION } from "../../src/content/legal";

/** Usuario válido para `LoginDto`/`CreateUserDto` (`^[A-Za-z0-9_]{3,32}$`). */
export const E2E_USER = "e2e_user";
export const E2E_PASSWORD = "Test1234!Test";

const APP_ORIGIN = "http://localhost:3100";

const envelope = (data: unknown[]) => ({
  status: true,
  message: "OK",
  data,
  timestamp: new Date().toISOString(),
});

/** Responde con CORS para el origen de la app (el API vive en otro puerto y usa cookies). */
export function fulfillJson(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": APP_ORIGIN,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type, authorization, x-csrf-token",
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    },
    body: JSON.stringify(body),
  });
}

const TOKENS = { access_token: "e2e-token", userId: 1, expires_in: 3600 };
const USER = {
  id: "1",
  external_id: "e2e",
  username: E2E_USER,
  email: "e2e@example.com",
  roles: ["user"],
  terms_version: LEGAL_VERSION,
};
const SUMMARY = {
  totals: { income: 0, expenses: 0, investments: 0, count: 0 },
  by_category: [],
  series: [],
};

/**
 * Simula el API completo con `page.route` (sin backend ni usuario real): login,
 * refresh, perfil y listas vacías. Los tests pueden registrar rutas más específicas
 * DESPUÉS de llamar esto (Playwright evalúa primero la última ruta registrada).
 */
export async function mockApi(page: Page) {
  await page.route(/\/socket\.io\//, (route) => route.abort());
  await page.route(/\/api\/v1\//, (route) => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, 204, {});
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1\//, "");
    if (path === "auth/login" || path === "auth/refresh") {
      return fulfillJson(route, 200, envelope([TOKENS]));
    }
    if (path === "user/1") return fulfillJson(route, 200, envelope([USER]));
    if (path.endsWith("transactions/summary")) return fulfillJson(route, 200, envelope([SUMMARY]));
    return fulfillJson(route, 200, envelope([]));
  });
}

type TestFixtures = {
  auth: AuthHelper;
  nav: NavHelper;
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  // Las aserciones de la UI están en español.
  // eslint-disable-next-line no-empty-pattern -- firma de fixture de Playwright
  locale: async ({}, use) => {
    await use("es-CO");
  },
  auth: async ({ page }, use) => {
    await use(new AuthHelper(page));
  },
  nav: async ({ page }, use) => {
    await use(new NavHelper(page));
  },
  authenticatedPage: async ({ page }, use) => {
    await mockApi(page);
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("juan_perez").fill(E2E_USER);
    await page.getByPlaceholder("••••••••").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: /iniciar sesión|iniciar sesion|entrar/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await use(page);
  },
});

export { expect } from "@playwright/test";
