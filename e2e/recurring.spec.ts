import { expect, type Page } from "@playwright/test";
import { test, fulfillJson, mockApi, E2E_USER, E2E_PASSWORD } from "./fixtures/index";

const envelope = (data: unknown[]) => ({
  status: true,
  message: "OK",
  data,
  timestamp: new Date().toISOString(),
});

const today = () => new Date().toLocaleDateString("en-CA");

const ACCOUNT = {
  id: 5,
  user_id: 1,
  bank_name: "Bancolombia",
  account_type: "savings",
  masked_account_number: "****1234",
  display_balance: "1000000",
  currency: "COP",
};

const RULE = {
  id: 9,
  name: "Arriendo",
  type: "expense",
  amount: 1200000,
  currency: "COP",
  category_id: null,
  subcategory_id: null,
  account_id: 5,
  liability_id: null,
  origin_account_id: null,
  destination_account_id: null,
  destination_liability_id: null,
  payment_method: null,
  frequency: "monthly",
  start_date: today(),
  next_due_date: today(),
  end_date: null,
  max_occurrences: null,
  occurrences_count: 1,
  remaining_occurrences: null,
  mode: "confirm",
  reminder_days: 1,
  status: "active",
  pending_validation_count: 1,
  created_at: new Date().toISOString(),
};

const PENDING_TX = {
  id: 77,
  user_id: 1,
  category_id: null,
  category_status: "uncategorized",
  type: "expense",
  amount: "1200000",
  currency: "COP",
  is_fixed: false,
  description: "Arriendo",
  transaction_date: today(),
  created_at: new Date().toISOString(),
  updated_at: null,
  account_id: 5,
  recurring_id: "9",
  needs_validation: true,
};

async function login(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("juan_perez").fill(E2E_USER);
  await page.getByPlaceholder("••••••••").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión|iniciar sesion|entrar/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

/** Estado del "backend" simulado: la regla existe tras el POST y el pago tras validar. */
async function mockRecurringApi(page: Page) {
  const state = { ruleCreated: false, validated: false, validateBody: null as unknown };
  await page.route(/\/api\/v1\/users\/1\//, (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1\/users\/1\//, "");
    const method = req.method();
    if (method === "OPTIONS") return fulfillJson(route, 204, {});
    if (path === "bank-accounts") return fulfillJson(route, 200, envelope([ACCOUNT]));
    if (path === "recurring-transactions" && method === "POST") {
      state.ruleCreated = true;
      return fulfillJson(route, 201, envelope([RULE]));
    }
    if (path === "recurring-transactions") {
      return fulfillJson(route, 200, envelope(state.ruleCreated ? [RULE] : []));
    }
    if (path === "recurring-transactions/validate/77" && method === "POST") {
      state.validated = true;
      state.validateBody = req.postDataJSON();
      return fulfillJson(
        route,
        200,
        envelope([{ ...PENDING_TX, needs_validation: false, transaction_date: today() }]),
      );
    }
    if (path === "transactions" && method === "GET") {
      return fulfillJson(route, 200, envelope(state.validated ? [] : [PENDING_TX]));
    }
    return route.fallback();
  });
  return state;
}

test.describe("Recurrentes: validar pago", () => {
  test("crea un recurrente por confirmar y valida el pago con fecha", async ({ page }) => {
    await mockApi(page);
    const state = await mockRecurringApi(page);
    await login(page);

    await page.goto("/recurring");
    await page
      .getByRole("button", { name: /nuevo recurrente/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Nuevo recurrente")).toBeVisible();
    await dialog.getByLabel("Nombre").fill("Arriendo");
    await dialog.getByLabel("Monto").fill("1200000");
    await dialog.getByLabel("Cuenta o pasivo").click();
    await page.getByRole("option", { name: /Bancolombia/ }).click();
    await expect(dialog.getByRole("button", { name: /por confirmar/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Arriendo" })).toBeVisible();
    expect(state.ruleCreated).toBe(true);

    await page.goto("/transactions");
    await expect(page.getByText("Validar pago", { exact: true })).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Validar pago: Arriendo" }).click();
    const validate = page.getByRole("dialog");
    const submit = validate.getByRole("button", { name: "Validar", exact: true });
    await expect(submit).toBeEnabled();

    // Sin fecha el botón queda deshabilitado.
    await validate.getByLabel("Fecha del pago").fill("");
    await expect(submit).toBeDisabled();

    await validate.getByLabel("Fecha del pago").fill(today());
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText("Validar pago", { exact: true })).toHaveCount(0);
    expect(state.validateBody).toMatchObject({ transaction_date: today(), amount: 1200000 });
  });

  test("la notificación recurring:validate abre el diálogo de validación", async ({ page }) => {
    await mockApi(page);
    await mockRecurringApi(page);
    await page.route(/\/api\/v1\/users\/1\/notifications/, (route) => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, 204, {});
      return fulfillJson(
        route,
        200,
        envelope([
          {
            id: 1,
            user_id: 1,
            title: "Pago por validar",
            description: "Arriendo",
            is_read: false,
            is_active: true,
            scheduled_at: null,
            reference: "recurring:validate:77",
            created_at: new Date().toISOString(),
            updated_at: null,
          },
        ]),
      );
    });
    await login(page);

    await page.getByRole("button", { name: "Notificaciones" }).click();
    await page.getByText("Pago por validar").click();

    await page.waitForURL(/\/transactions\?.*validate=77/);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Validar pago")).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByLabel("Fecha del pago")).toHaveValue(today());
  });
});
