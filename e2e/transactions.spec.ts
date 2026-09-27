import { expect } from "@playwright/test";
import { test } from "./fixtures/index";

test.describe("Transacciones", () => {
  test("muestra lista de transacciones", async ({ authenticatedPage: page }) => {
    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: /transacciones/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("button", { name: "Nueva", exact: true })).toBeVisible({
      timeout: 5000,
    });
  });

  test("sin transacciones ofrece crear o importar", async ({ authenticatedPage: page }) => {
    await page.goto("/transactions");
    const empty = page.getByText("No se encontraron transacciones.").locator("..");
    await expect(empty.getByRole("button", { name: "Nueva transacción" })).toBeVisible();
    await expect(empty.getByRole("button", { name: "Importar extracto" })).toBeVisible();
  });

  test("puede abrir diálogo de nueva transacción", async ({ authenticatedPage: page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Nueva", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/nueva transacción/i)).toBeVisible();
  });

  test("sin categorías permite registrar (categoría opcional)", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Nueva", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Monto")).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText("Sin categorías configuradas")).toHaveCount(0);
  });

  test("muestra tipos de transacción en el diálogo", async ({ authenticatedPage: page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Nueva", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText("Gasto", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Ingreso", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Inversión", { exact: true })).toBeVisible();
  });

  test("puede cerrar el diálogo de transacción", async ({ authenticatedPage: page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Nueva", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
  });

  test("el botón + global abre el diálogo desde otra pantalla", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/goals");
    await expect(page.getByRole("heading", { name: /ahorrando/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Nueva transacción" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/nueva transacción/i)).toBeVisible();
  });
});
