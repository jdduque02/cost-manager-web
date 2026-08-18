import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("Dashboard", () => {
  test("muestra resumen financiero", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    const cards = page.locator("[class*='card']");
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test("muestra balance del mes", async ({ authenticatedPage: page }) => {
    await expect(page.getByText(/balance|resumen/i)).toBeVisible({ timeout: 10000 });
  });

  test("muestra gráfico de gastos por categoría", async ({ authenticatedPage: page }) => {
    await expect(page.getByText(/gastos por categoría|por categoría/i)).toBeVisible({ timeout: 10000 });
  });
});
