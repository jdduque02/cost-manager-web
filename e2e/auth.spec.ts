import { expect } from "@playwright/test";
import { test, mockApi, fulfillJson, E2E_USER, E2E_PASSWORD } from "./fixtures/index";

test.describe("Autenticación", () => {
  test("muestra formulario de login", async ({ auth }) => {
    await auth.gotoLogin();
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.passwordInput).toBeVisible();
    await expect(auth.submitButton).toBeVisible();
  });

  test("muestra el mensaje del API con credenciales inválidas", async ({ auth, page }) => {
    await mockApi(page);
    await page.route(/\/api\/v1\/auth\/(login|refresh)$/, (route) =>
      fulfillJson(route, 401, { status: false, message: "Usuario o contraseña incorrectos." }),
    );
    await auth.login("wrong_user", "badpassword");
    await expect(page.getByRole("alert")).toHaveText("Usuario o contraseña incorrectos.");
    expect(page.url()).toContain("/login");
  });

  test("tras iniciar sesión vuelve a la ruta pedida", async ({ auth, page }) => {
    await mockApi(page);
    await page.goto("/goals");
    await page.waitForURL(/\/login\?redirect=%2Fgoals$/);
    await auth.emailInput.fill(E2E_USER);
    await auth.passwordInput.fill(E2E_PASSWORD);
    await auth.submitButton.click();
    await page.waitForURL("**/goals");
    await expect(
      page.getByRole("heading", { name: /ahorrando para lo que importa/i }),
    ).toBeVisible();
  });

  test("ignora un redirect externo", async ({ auth, page }) => {
    await mockApi(page);
    await page.goto("/login?redirect=%2F%2Fevil.example.com");
    await page.waitForLoadState("networkidle");
    await auth.emailInput.fill(E2E_USER);
    await auth.passwordInput.fill(E2E_PASSWORD);
    await auth.submitButton.click();
    await page.waitForURL("**/dashboard");
  });

  test("muestra formulario de registro", async ({ auth }) => {
    await auth.gotoRegister();
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.page.getByPlaceholder("juan_perez")).toBeVisible();
  });

  test("muestra formulario de forgot password", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByPlaceholder("tu@correo.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /enviar|restablecer/i })).toBeVisible();
  });

  test("muestra formulario de reset password", async ({ page }) => {
    await page.goto("/reset-password?email=test@example.com");
    await expect(page.getByPlaceholder("000000")).toBeVisible();
  });
});