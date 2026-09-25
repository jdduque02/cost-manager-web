import { expect, test } from "@playwright/test";

// Los mensajes de error siguen el idioma del navegador; las aserciones son en español.
test.use({ locale: "es-CO" });

const LEGAL = [
  { path: "/privacidad", heading: /tratamiento de datos personales/i },
  { path: "/cookies", heading: /política de cookies/i },
  { path: "/terminos", heading: /términos y condiciones/i },
];

test.describe("Documentos legales", () => {
  for (const { path, heading } of LEGAL) {
    test(`${path} es pública y accesible`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "es");
    });
  }

  test("la landing enlaza los tres documentos y no promete lo que no puede respaldar", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("navigation", { name: "Pie de página" });
    await expect(footer.getByRole("link", { name: "Privacidad" })).toHaveAttribute(
      "href",
      "/privacidad",
    );
    await expect(footer.getByRole("link", { name: "Términos" })).toHaveAttribute(
      "href",
      "/terminos",
    );
    await expect(footer.getByRole("link", { name: "Cookies" })).toHaveAttribute("href", "/cookies");
    await expect(page.getByText(/multiplica|comenzar gratis|picos de uso/i)).toHaveCount(0);
  });
});

test.describe("Teclado y consentimiento en el registro", () => {
  test("el primer Tab muestra el enlace para saltar al contenido", async ({ page }) => {
    await page.goto("/register");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
  });

  test("se completa solo con teclado y envía la versión aceptada", async ({ page }) => {
    let body: Record<string, unknown> | null = null;
    await page.route(/\/api\/v1\/user$/, async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "1", external_id: "e", username: "juan", email: "j@t.co" }),
      });
    });

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Nombre completo *").focus();
    await page.keyboard.type("Juan Perez");
    await page.keyboard.press("Tab");
    await page.keyboard.type("juan_perez");
    await page.keyboard.press("Tab");
    await page.keyboard.type("juan@ejemplo.com");
    await page.keyboard.press("Tab");
    await page.keyboard.type("TestPass123!!");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Confirmar contrasena *")).toBeFocused();
    await page.keyboard.type("TestPass123!!");

    // Sin consentimiento no se envía y el error se anuncia
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert")).toContainText(/debes aceptar/i);
    expect(body).toBeNull();

    await page.keyboard.press("Tab");
    const consent = page.getByRole("checkbox", { name: /mayor de 18/i });
    await expect(consent).toBeFocused();
    await page.keyboard.press("Space");
    await expect(consent).toBeChecked();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Cuenta creada" })).toBeVisible();
    expect(body).toMatchObject({
      accepted_terms_version: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(body).not.toHaveProperty("phone");
    expect(body).not.toHaveProperty("document_id");
    expect(body).not.toHaveProperty("address");
  });
});
