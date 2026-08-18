import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("Categorías", () => {
  test("muestra lista de categorías", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/categories");
    await expect(page.getByRole("heading", { name: /categorías/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /nueva categoría|nueva|agregar/i })).toBeVisible({ timeout: 5000 });
  });

  test("puede abrir diálogo de nueva categoría", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/categories");
    await page.getByRole("button", { name: /nueva categoría|nueva|agregar/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/nueva categoría/i)).toBeVisible();
  });

  test("muestra campos del formulario de categoría", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/categories");
    await page.getByRole("button", { name: /nueva categoría|nueva|agregar/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Nombre")).toBeVisible();
    await expect(page.getByText("Tipo")).toBeVisible();
  });

  test("puede cerrar el diálogo de categoría", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/categories");
    await page.getByRole("button", { name: /nueva categoría|nueva|agregar/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
  });
});
