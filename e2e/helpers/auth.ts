import { type Page, type Locator, expect } from "@playwright/test";

export class AuthHelper {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder("tu@ejemplo.com");
    this.passwordInput = page.getByPlaceholder("••••••••");
    this.submitButton = page.getByRole("button", { name: /iniciar sesion|entrar/i });
  }

  async gotoLogin() {
    await this.page.goto("/auth/login");
    await this.page.waitForLoadState("networkidle");
  }

  async gotoRegister() {
    await this.page.goto("/auth/register");
    await this.page.waitForLoadState("networkidle");
  }

  async login(email: string, password: string) {
    await this.gotoLogin();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoggedIn() {
    await this.page.waitForURL("**/dashboard", { timeout: 10000 });
    expect(this.page.url()).toContain("/dashboard");
  }

  async expectLoginError(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.submitButton).toBeVisible();
    }
  }
}
