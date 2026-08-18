import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("Navegación", () => {
  test("redirige a login cuando no está autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/auth/login", { timeout: 10000 });
    expect(page.url()).toContain("/auth");
  });

  test("muestra dashboard después de login", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test("puede navegar a transacciones", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/transactions");
    await expect(page.getByRole("heading", { name: /transacciones/i })).toBeVisible({ timeout: 10000 });
  });

  test("puede navegar a categorías", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/categories");
    await expect(page.getByRole("heading", { name: /categorías/i })).toBeVisible({ timeout: 10000 });
  });

  test("puede navegar a registro manual", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/register");
    await expect(page.getByRole("heading", { name: /registro/i })).toBeVisible({ timeout: 10000 });
  });
});
