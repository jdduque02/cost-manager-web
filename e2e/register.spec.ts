import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("Registro manual", () => {
  test("muestra formulario de registro manual", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/register");
    await expect(page.getByRole("heading", { name: /registro/i })).toBeVisible({ timeout: 10000 });
  });

  test("muestra campos del formulario", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/register");
    await expect(page.getByRole("heading", { name: /registro/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/monto|importe/i)).toBeVisible();
    await expect(page.getByText(/descripción/i)).toBeVisible();
    await expect(page.getByText(/fecha/i)).toBeVisible();
  });
});
