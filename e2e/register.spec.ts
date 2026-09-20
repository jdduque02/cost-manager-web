import { expect } from "@playwright/test";
import { test } from "./fixtures/index";

test.describe("Registro manual de transacciones", () => {
  test("abre el diálogo de nueva transacción", async ({ authenticatedPage: page }) => {
    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: /transacciones/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /nueva transacción|nuevo|agregar/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  });

  test("muestra campos del formulario en el diálogo", async ({ authenticatedPage: page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: /nueva transacción|nuevo|agregar/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/monto|importe/i)).toBeVisible();
    await expect(page.getByText(/descripción/i)).toBeVisible();
    await expect(page.getByText(/fecha/i)).toBeVisible();
  });
});