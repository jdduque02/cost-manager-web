type Errors = typeof import("./errors");

async function load(): Promise<Errors> {
  vi.resetModules();
  return import("./errors");
}

function setNavLang(lang: string) {
  vi.spyOn(window.navigator, "language", "get").mockReturnValue(lang);
}

beforeEach(() => {
  window.localStorage.clear();
  setNavLang("es-CO");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getLocale", () => {
  it("uses a valid locale from localStorage", async () => {
    window.localStorage.setItem("cm:locale", "en");
    const m = await load();
    expect(m.getLocale()).toBe("en");
  });

  it("ignores an invalid stored value and falls back to navigator", async () => {
    window.localStorage.setItem("cm:locale", "fr");
    setNavLang("en-US");
    const m = await load();
    expect(m.getLocale()).toBe("en");
  });

  it("uses navigator.language when it starts with en", async () => {
    setNavLang("en-GB");
    const m = await load();
    expect(m.getLocale()).toBe("en");
  });

  it("defaults to es for any other navigator language", async () => {
    setNavLang("fr-FR");
    const m = await load();
    expect(m.getLocale()).toBe("es");
  });

  it("does not throw when localStorage throws and falls back to navigator", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    setNavLang("en-US");
    const m = await load();
    expect(m.getLocale()).toBe("en");
  });
});

describe("setLocale", () => {
  it("persists only the locale under cm:locale and updates getLocale", async () => {
    const m = await load();
    m.setLocale("en");
    expect(m.getLocale()).toBe("en");
    expect(window.localStorage.getItem("cm:locale")).toBe("en");
    expect(window.localStorage.length).toBe(1);
  });

  it("keeps the in-memory locale when localStorage.setItem throws", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const m = await load();
    expect(() => m.setLocale("en")).not.toThrow();
    expect(m.getLocale()).toBe("en");
  });
});

describe("translateApiMessage", () => {
  it("localizes a known code in es and en", async () => {
    const m = await load();
    m.setLocale("es");
    expect(m.translateApiMessage("auth.IP_NOT_ALLOWED", 403)).toBe(
      "Tu dirección IP no tiene permiso para acceder.",
    );
    m.setLocale("en");
    expect(m.translateApiMessage("auth.IP_NOT_ALLOWED", 403)).toBe(
      "Your IP address is not allowed to access.",
    );
  });

  it.each([
    [
      400,
      "Solicitud inválida. Revisa los datos e intenta de nuevo.",
      "Invalid request. Check the data and try again.",
    ],
    [401, "Debes iniciar sesión para continuar.", "You must sign in to continue."],
    [403, "No tienes permiso para realizar esta acción.", "You don't have permission to do this."],
    [404, "No se encontró lo que buscas.", "We couldn't find what you're looking for."],
    [
      409,
      "Esta acción entra en conflicto con datos existentes.",
      "This action conflicts with existing data.",
    ],
    [422, "Los datos enviados no son válidos.", "The submitted data is not valid."],
    [
      429,
      "Demasiados intentos. Espera un momento e intenta de nuevo.",
      "Too many attempts. Wait a moment and try again.",
    ],
    [
      500,
      "Error del servidor. Intenta de nuevo más tarde.",
      "Server error. Please try again later.",
    ],
    [
      503,
      "Error del servidor. Intenta de nuevo más tarde.",
      "Server error. Please try again later.",
    ],
    [
      0,
      "Sin conexión con el servidor. Revisa tu internet.",
      "Can't reach the server. Check your connection.",
    ],
    [418, "Ocurrió un error inesperado.", "An unexpected error occurred."],
  ])("unknown code with status %i falls back by status", async (status, es, en) => {
    const m = await load();
    m.setLocale("es");
    expect(m.translateApiMessage("auth.SOMETHING_NEW", status)).toBe(es);
    m.setLocale("en");
    expect(m.translateApiMessage("auth.SOMETHING_NEW", status)).toBe(en);
  });

  it("uses the status fallback when the message is missing", async () => {
    const m = await load();
    m.setLocale("es");
    expect(m.translateApiMessage(undefined, 404)).toBe("No se encontró lo que buscas.");
    expect(m.translateApiMessage("", 0)).toBe("Sin conexión con el servidor. Revisa tu internet.");
  });

  it("passes free text through untouched", async () => {
    const m = await load();
    m.setLocale("en");
    expect(m.translateApiMessage("El email ya está registrado", 409)).toBe(
      "El email ya está registrado",
    );
    expect(m.translateApiMessage("email must be an email", 400)).toBe("email must be an email");
  });
});

describe("t", () => {
  it("returns the localized text, then fallback, then the key", async () => {
    const m = await load();
    m.setLocale("en");
    expect(m.t("ui.lang.label")).toBe("Language");
    expect(m.t("no.such.key", "fb")).toBe("fb");
    expect(m.t("no.such.key")).toBe("no.such.key");
  });
});
