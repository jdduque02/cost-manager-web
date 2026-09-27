import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { test, fulfillJson } from "./fixtures/index";

/** KPI "Patrimonio" dentro del contenido (el menú lateral tiene un enlace con el mismo texto). */
const kpi = (page: Page) => page.locator("#main").getByText("Patrimonio", { exact: true });

test.describe("Dashboard", () => {
  test("muestra resumen financiero", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: /resumen/i })).toBeVisible({ timeout: 10000 });
    const cards = page.locator("[class*='card']");
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test("muestra balance del mes", async ({ authenticatedPage: page }) => {
    await expect(page.getByText(/balance|resumen/i)).toBeVisible({ timeout: 10000 });
  });

  test("muestra el desglose de gastos por categoría", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: "Desglose de gastos" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("muestra los KPIs cargados (no el skeleton)", async ({ authenticatedPage: page }) => {
    await expect(kpi(page)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("kpi-skeleton")).toHaveCount(0);
  });

  test("si falla el resumen muestra error y Reintentar lo recupera", async ({
    authenticatedPage: page,
  }) => {
    let fail = true;
    await page.route(/\/transactions\/summary/, (route) =>
      fail
        ? fulfillJson(route, 500, { status: false, message: "Error del servidor." })
        : route.fallback(),
    );
    await page.goto("/dashboard");
    const alert = page.getByRole("alert").filter({ hasText: "No se pudo cargar tu resumen" });
    await expect(alert).toBeVisible({ timeout: 15000 });
    fail = false;
    await alert.getByRole("button", { name: "Reintentar" }).click();
    await expect(kpi(page)).toBeVisible({ timeout: 10000 });
  });
});
