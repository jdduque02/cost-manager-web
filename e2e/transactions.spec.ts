import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("Transacciones", () => {
  test("muestra lista de transacciones", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/transactions");
    await expect(page.getByRole("heading", { name: /transacciones/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /nueva transacción|nuevo|agregar/i })).toBeVisible({ timeout: 5000 });
  });

  test("puede abrir diálogo de nueva transacción", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/transactions");
    await page.getByRole("button", { name: /nueva transacción|nuevo|agregar/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/nueva transacción/i)).toBeVisible();
  });

  test("muestra tipos de transacción en el diálogo", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/transactions");
    await page.getByRole("button", { name: /nueva transacción|nuevo|agregar/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Gasto")).toBeVisible();
    await expect(page.getByText("Ingreso")).toBeVisible();
    await expect(page.getByText("Inversión")).toBeVisible();
  });

  test("puede cerrar el diálogo de transacción", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/transactions");
    await page.getByRole("button", { name: /nueva transacción|nuevo|agregar/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
  });
});
