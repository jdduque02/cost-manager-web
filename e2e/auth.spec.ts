import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("Autenticación", () => {
  test("muestra formulario de login", async ({ auth }) => {
    await auth.gotoLogin();
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.passwordInput).toBeVisible();
    await expect(auth.submitButton).toBeVisible();
  });

  test("muestra error con credenciales inválidas", async ({ auth }) => {
    await auth.login("wrong@example.com", "badpassword");
    await auth.expectLoginError();
  });

  test("muestra formulario de registro", async ({ auth }) => {
    await auth.gotoRegister();
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.page.getByPlaceholder("juan_perez")).toBeVisible();
  });

  test("muestra formulario de forgot password", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.getByPlaceholder("tu@ejemplo.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /enviar|restablecer/i })).toBeVisible();
  });

  test("muestra formulario de reset password", async ({ page }) => {
    await page.goto("/auth/reset-password");
    await expect(page.getByPlaceholder("000000")).toBeVisible();
  });
});
