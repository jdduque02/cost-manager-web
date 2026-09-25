/**
 * i18n mínimo (es/en) para mensajes de error y toasts. Sin librería.
 * - Códigos del API ("auth.IP_NOT_ALLOWED") -> texto localizado.
 * - Fallback por status HTTP / red cuando el código no está en el diccionario.
 * - Textos fijos de la UI vía `t(key)`.
 * Solo el idioma ("es" | "en") se guarda en localStorage; nada sensible.
 */

export type Locale = "es" | "en";

export const LOCALE_KEY = "cm:locale";

const LOCALES: readonly Locale[] = ["es", "en"];

function isLocale(v: unknown): v is Locale {
  return LOCALES.includes(v as Locale);
}

let currentLocale: Locale | null = null;

export function getLocale(): Locale {
  if (currentLocale) return currentLocale;
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) return (currentLocale = stored);
  } catch {
    // modo privado / sin storage: cae a navigator
  }
  const nav = typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : undefined;
  return (currentLocale = nav === "en" ? "en" : "es");
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore: queda solo en memoria
  }
}

type Dict = Record<string, string>;

/** Códigos del API (`<dominio>.<CODIGO>`) y textos fijos de la UI. */
const messages: Record<Locale, Dict> = {
  es: {
    // Códigos del API
    "auth.IP_NOT_ALLOWED": "Tu dirección IP no tiene permiso para acceder.",
    "auth.INVALID_CREDENTIALS": "Usuario o contraseña incorrectos.",
    "auth.SESSION_EXPIRED": "Tu sesión expiró. Inicia sesión de nuevo.",
    // Fallback por status
    "http.400": "Solicitud inválida. Revisa los datos e intenta de nuevo.",
    "http.401": "Debes iniciar sesión para continuar.",
    "http.403": "No tienes permiso para realizar esta acción.",
    "http.404": "No se encontró lo que buscas.",
    "http.409": "Esta acción entra en conflicto con datos existentes.",
    "http.422": "Los datos enviados no son válidos.",
    "http.429": "Demasiados intentos. Espera un momento e intenta de nuevo.",
    "http.5xx": "Error del servidor. Intenta de nuevo más tarde.",
    "http.network": "Sin conexión con el servidor. Revisa tu internet.",
    "http.unknown": "Ocurrió un error inesperado.",

    // UI
    "ui.lang.es": "Español",
    "ui.lang.en": "English",
    "ui.lang.label": "Idioma",
    "err.category.create": "Error al crear la categoría",
    "err.subcategory.create": "Error al crear subcategoría",
    "err.subcategory.update": "Error al actualizar subcategoría",
    "err.subcategory.delete": "Error al eliminar subcategoría",
    "err.category.delete": "Error al eliminar la categoría",
    "err.category.update": "Error al actualizar la categoría",
    "err.company.update": "Error al actualizar la empresa",
    "err.company.create": "Error al crear la empresa",
    "err.company.delete": "Error al eliminar la empresa",
    "err.template.load": "No se pudo cargar la plantilla.",
    "err.template.save": "No se pudo guardar la plantilla.",
    "err.forgot.email": "Por favor ingresa tu correo electrónico",
    "err.forgot.send": "No se pudo enviar el código. Verifica tu correo e intenta de nuevo.",
    "err.goal.quota": "Error al calcular cuota",
    "err.goal.update": "Error al actualizar la meta",
    "err.goal.create": "Error al crear la meta",
    "err.goal.delete": "Error al eliminar la meta",
    "err.tax.calc": "No se pudo calcular el resumen fiscal",
    "err.report.download": "No se pudo descargar el reporte",
    "err.retry.seconds": "Intenta de nuevo en unos segundos.",
    "err.login.empty": "Por favor ingresa el usuario y contraseña",
    "err.login.failed": "Credenciales inválidas o error del servidor",
    "err.news.required": "Título y resumen son obligatorios",
    "err.news.mail.required": "Asunto y cuerpo son obligatorios",
    "err.register.required": "Por favor completa todos los campos obligatorios",
    "err.register.mismatch": "Las contrasenas no coinciden",
    "err.register.weak": "La contrasena no cumple con los requisitos",
    "err.register.create": "Error al crear la cuenta",
    "err.register.consent":
      "Debes aceptar los términos y la política de privacidad, y confirmar que eres mayor de 18 años",
    "err.reset.code": "Ingresa el código de 6 dígitos",
    "err.reset.invalid": "Código inválido o expirado. Intenta de nuevo.",
    "err.reset.newpass": "Ingresa la nueva contraseña",
    "err.reset.min": "La contraseña debe tener al menos 12 caracteres",
    "err.reset.mismatch": "Las contraseñas no coinciden",
    "err.reset.fail": "No se pudo restablecer la contraseña. Intenta de nuevo.",
    "err.profile.update": "No se pudo actualizar el perfil",
    "err.prefs.save": "No se pudieron guardar las preferencias",
    "err.session.revoke": "No se pudo revocar la sesion",
    "err.import.create": "Error al crear la carga",
    "err.import.retry": "Error al reintentar",
    "err.tax.update": "Error al actualizar el resumen fiscal",
    "err.tx.update": "Error al actualizar la transacción",
    "err.tx.create": "Error al crear la transacción",
    "err.transfer.delete": "Error al eliminar la transferencia",
    "err.tx.delete": "Error al eliminar la transacción",
    "err.tx.deleteMany": "Error al eliminar las transacciones",
    "err.transfer.clone": "Error al clonar la transferencia",
    "err.tx.clone": "Error al clonar la transacción",
    "err.transfer.same": "La cuenta de origen y destino deben ser diferentes",
    "err.transfer.update": "Error al actualizar la transferencia",
    "err.transfer.create": "Error al registrar la transferencia",
    "err.delete": "Error al eliminar",
    "err.wealth.quotes": "Error al consultar los valores en línea",
    "err.wealth.primary": "Error al actualizar la cuenta principal",
    "err.wealth.4x1000": "Error al actualizar la exención 4x1000",
    "err.account.update": "Error al actualizar la cuenta",
    "err.asset.update": "Error al actualizar el activo",
    "err.asset.create": "Error al crear el activo",
    "err.debt.update": "Error al actualizar la deuda",
    "err.debt.create": "Error al crear la deuda",
    "err.session.expiredTitle": "Sesión expirada",
    "err.session.expiredDesc": "Tu sesión ha expirado. Por favor, inicia sesión de nuevo.",
  },
  en: {
    "auth.IP_NOT_ALLOWED": "Your IP address is not allowed to access.",
    "auth.INVALID_CREDENTIALS": "Incorrect username or password.",
    "auth.SESSION_EXPIRED": "Your session expired. Please sign in again.",
    "http.400": "Invalid request. Check the data and try again.",
    "http.401": "You must sign in to continue.",
    "http.403": "You don't have permission to do this.",
    "http.404": "We couldn't find what you're looking for.",
    "http.409": "This action conflicts with existing data.",
    "http.422": "The submitted data is not valid.",
    "http.429": "Too many attempts. Wait a moment and try again.",
    "http.5xx": "Server error. Please try again later.",
    "http.network": "Can't reach the server. Check your connection.",
    "http.unknown": "An unexpected error occurred.",

    // UI
    "ui.lang.es": "Español",
    "ui.lang.en": "English",
    "ui.lang.label": "Language",
    "err.category.create": "Error creating category",
    "err.subcategory.create": "Error creating subcategory",
    "err.subcategory.update": "Error updating subcategory",
    "err.subcategory.delete": "Error deleting subcategory",
    "err.category.delete": "Error deleting category",
    "err.category.update": "Error updating category",
    "err.company.update": "Error updating company",
    "err.company.create": "Error creating company",
    "err.company.delete": "Error deleting company",
    "err.template.load": "Could not load the template.",
    "err.template.save": "Could not save the template.",
    "err.forgot.email": "Please enter your email",
    "err.forgot.send": "Could not send the code. Check your email and try again.",
    "err.goal.quota": "Error calculating installment",
    "err.goal.update": "Error updating goal",
    "err.goal.create": "Error creating goal",
    "err.goal.delete": "Error deleting goal",
    "err.tax.calc": "Could not compute the tax summary",
    "err.report.download": "Could not download the report",
    "err.retry.seconds": "Try again in a few seconds.",
    "err.login.empty": "Please enter your username and password",
    "err.login.failed": "Invalid credentials or server error",
    "err.news.required": "Title and summary are required",
    "err.news.mail.required": "Subject and body are required",
    "err.register.required": "Please fill in all required fields",
    "err.register.mismatch": "Passwords do not match",
    "err.register.weak": "Password does not meet the requirements",
    "err.register.create": "Error creating account",
    "err.register.consent":
      "You must accept the terms and privacy policy, and confirm you are over 18",
    "err.reset.code": "Enter the 6-digit code",
    "err.reset.invalid": "Invalid or expired code. Try again.",
    "err.reset.newpass": "Enter the new password",
    "err.reset.min": "Password must be at least 12 characters",
    "err.reset.mismatch": "Passwords do not match",
    "err.reset.fail": "Could not reset the password. Try again.",
    "err.profile.update": "Could not update profile",
    "err.prefs.save": "Could not save preferences",
    "err.session.revoke": "Could not revoke the session",
    "err.import.create": "Error creating the upload",
    "err.import.retry": "Error retrying",
    "err.tax.update": "Error updating the tax summary",
    "err.tx.update": "Error updating transaction",
    "err.tx.create": "Error creating transaction",
    "err.transfer.delete": "Error deleting transfer",
    "err.tx.delete": "Error deleting transaction",
    "err.tx.deleteMany": "Error deleting transactions",
    "err.transfer.clone": "Error cloning transfer",
    "err.tx.clone": "Error cloning transaction",
    "err.transfer.same": "Source and destination accounts must be different",
    "err.transfer.update": "Error updating transfer",
    "err.transfer.create": "Error registering transfer",
    "err.delete": "Error deleting",
    "err.wealth.quotes": "Error fetching live values",
    "err.wealth.primary": "Error updating primary account",
    "err.wealth.4x1000": "Error updating 4x1000 exemption",
    "err.account.update": "Error updating account",
    "err.asset.update": "Error updating asset",
    "err.asset.create": "Error creating asset",
    "err.debt.update": "Error updating debt",
    "err.debt.create": "Error creating debt",
    "err.session.expiredTitle": "Session expired",
    "err.session.expiredDesc": "Your session has expired. Please sign in again.",
  },
};

/** Texto localizado de `key`; si no existe devuelve `fallback ?? key`. */
export function t(key: string, fallback?: string): string {
  const dict = messages[getLocale()];
  return Object.hasOwn(dict, key) ? dict[key] : (fallback ?? key);
}

const API_CODE = /^[a-z][a-z0-9]*(\.[A-Za-z0-9_]+)+$/;

/** Clave de fallback según status HTTP (0 = error de red). */
function statusKey(status: number): string {
  if (status === 0) return "http.network";
  if (status >= 500) return "http.5xx";
  return Object.hasOwn(messages.es, `http.${status}`) ? `http.${status}` : "http.unknown";
}

/**
 * Traduce el `message` que devuelve el API. Si es un código conocido lo
 * localiza; si parece código pero no está en el diccionario usa el fallback por
 * status; si es texto libre (p. ej. validación) lo deja tal cual.
 */
export function translateApiMessage(message: string | undefined, status: number): string {
  if (message && Object.hasOwn(messages[getLocale()], message)) return t(message);
  if (!message || API_CODE.test(message)) return t(statusKey(status));
  return message;
}
