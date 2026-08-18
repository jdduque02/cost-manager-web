import { type Page, type Locator, expect } from "@playwright/test";

export class NavHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoDashboard() {
    await this.page.goto("/dashboard");
    await this.page.waitForLoadState("networkidle");
  }

  async gotoTransactions() {
    await this.page.goto("/dashboard/transactions");
    await this.page.waitForLoadState("networkidle");
  }

  async gotoCategories() {
    await this.page.goto("/dashboard/categories");
    await this.page.waitForLoadState("networkidle");
  }

  async gotoRegister() {
    await this.page.goto("/dashboard/register");
    await this.page.waitForLoadState("networkidle");
  }

  async expectPageTitle(title: string | RegExp) {
    await expect(this.page.getByRole("heading", { name: title })).toBeVisible({ timeout: 10000 });
  }

  async clickNavItem(label: string | RegExp) {
    await this.page.getByRole("link", { name: label }).click();
    await this.page.waitForLoadState("networkidle");
  }
}
