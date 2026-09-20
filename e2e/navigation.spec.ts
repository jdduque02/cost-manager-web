import { expect } from "@playwright/test";
import { test } from "./fixtures/index";

test.describe("Navegación", () => {
  test("redirige a login cuando no está autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("muestra dashboard después de login", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: /resumen/i })).toBeVisible({ timeout: 10000 });
  });

  test("puede navegar a transacciones", async ({ authenticatedPage: page }) => {
    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: /transacciones/i })).toBeVisible({ timeout: 10000 });
  });

  test("puede navegar a categorías", async ({ authenticatedPage: page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: /categorías/i })).toBeVisible({ timeout: 10000 });
  });

  test("puede registrar una transacción manualmente", async ({ authenticatedPage: page }) => {
    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: /transacciones/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /nueva transacción|nuevo|agregar/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  });
});