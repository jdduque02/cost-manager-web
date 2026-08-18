import { test as base, type Page } from "@playwright/test";
import { AuthHelper } from "../helpers/auth";
import { NavHelper } from "../helpers/navigation";

type TestFixtures = {
  auth: AuthHelper;
  nav: NavHelper;
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  auth: async ({ page }, use) => {
    await use(new AuthHelper(page));
  },
  nav: async ({ page }, use) => {
    await use(new NavHelper(page));
  },
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("tu@ejemplo.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("Test1234!");
    await page.getByRole("button", { name: /iniciar sesion|entrar/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await use(page);
  },
});

export { expect } from "@playwright/test";
