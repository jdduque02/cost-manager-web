/**
 * Textos legales de Sprig (borrador).
 * Los campos [COMPLETAR] deben llenarse y el conjunto revisarse por un abogado
 * colombiano antes de publicar. Al cambiar el contenido, actualiza LEGAL_VERSION:
 * es la versión que se guarda como prueba de la autorización del usuario.
 */
export const LEGAL_VERSION = "2026-09-24";

const CONTROLLER = {
  name: "[COMPLETAR: razón social o nombre del responsable]",
  id: "[COMPLETAR: NIT o C.C.]",
  address: "[COMPLETAR: domicilio, ciudad y país]",
  email: "[COMPLETAR: correo para consultas y reclamos de datos personales]",
} as const;

type LegalSection = { heading: string; paragraphs?: string[]; items?: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };
export type LegalSlug = "privacidad" | "cookies" | "terminos";

const controllerLine = `${CONTROLLER.name}, ${CONTROLLER.id}, domicilio ${CONTROLLER.address}, correo ${CONTROLLER.email}.`;

export const LEGAL_DOCS: Record<LegalSlug, LegalDoc> = {
  privacidad: {
    title: "Política de Tratamiento de Datos Personales",
    intro:
      "Esta política aplica al tratamiento de datos personales en Sprig y se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas colombianas concordantes.",
    sections: [
      {
        heading: "1. Responsable del tratamiento",
        paragraphs: [controllerLine],
      },
      {
        heading: "2. Datos que recolectamos",
        paragraphs: ["Solo recolectamos los datos necesarios para prestar el servicio:"],
        items: [
          "Al registrarte (obligatorios): nombre completo, nombre de usuario, correo electrónico y contraseña.",
          "Configuración automática: idioma y zona horaria de tu dispositivo.",
          "Datos que tú registras: transacciones, cuentas, activos, deudas, metas de ahorro, categorías y presupuestos.",
          "Opcionales, solo si los ingresas en Configuración: teléfono, documento de identidad y dirección. Puedes usar Sprig sin ellos.",
          "Registros técnicos y de seguridad del servicio [COMPLETAR: confirmar qué se registra, p. ej. fecha de acceso y dirección IP].",
        ],
      },
      {
        heading: "3. Finalidades",
        items: [
          "Crear y administrar tu cuenta y autenticarte.",
          "Mostrarte tus movimientos, reportes, metas y proyecciones a partir de lo que registras.",
          "Enviarte mensajes transaccionales del servicio, como la recuperación de contraseña.",
          "Mantener la seguridad, prevenir fraudes y atender requerimientos de autoridad competente.",
        ],
        paragraphs: ["No vendemos tus datos ni los usamos para publicidad de terceros."],
      },
      {
        heading: "4. Autorización",
        paragraphs: [
          "Tratamos tus datos con tu autorización previa, expresa e informada, que otorgas marcando la casilla de aceptación al crear tu cuenta. Guardamos la fecha y la versión de esta política que aceptaste como prueba de la autorización. Puedes revocarla en cualquier momento, salvo que exista un deber legal o contractual de conservar los datos.",
        ],
      },
      {
        heading: "5. Tus derechos",
        paragraphs: ["Como titular puedes, conforme al artículo 8 de la Ley 1581 de 2012:"],
        items: [
          "Conocer, actualizar y rectificar tus datos.",
          "Solicitar prueba de la autorización otorgada.",
          "Ser informado sobre el uso que se ha dado a tus datos.",
          "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).",
          "Revocar la autorización y solicitar la supresión de tus datos, cuando no haya un deber legal de conservarlos.",
          "Acceder de forma gratuita a tus datos.",
        ],
      },
      {
        heading: "6. Cómo ejercer tus derechos",
        paragraphs: [
          `Escribe a ${CONTROLLER.email} indicando tu nombre, usuario y lo que solicitas. Las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles, contados desde su recibo (artículos 14 y 15 de la Ley 1581 de 2012). Antes de acudir a la SIC debes agotar este trámite.`,
        ],
      },
      {
        heading: "7. Encargados y transferencia de datos",
        paragraphs: [
          "Usamos proveedores que tratan datos por cuenta nuestra (alojamiento, autenticación y correo electrónico) [COMPLETAR: listar proveedores y países]. Si un proveedor está fuera de Colombia, la transferencia o transmisión internacional se hace con las garantías exigidas por la ley.",
          "Para mostrar cotizaciones y tasas de cambio consultamos proveedores externos desde nuestros servidores. En esas consultas solo se envían símbolos o códigos de moneda, nunca tus datos personales.",
        ],
      },
      {
        heading: "8. Seguridad y conservación",
        paragraphs: [
          "Aplicamos medidas técnicas y organizativas para proteger tus datos, entre ellas conexión cifrada y sesiones con cookies protegidas. Ningún sistema es infalible. Conservamos tus datos mientras tengas cuenta y el tiempo que la ley exija después.",
        ],
      },
      {
        heading: "9. Menores de edad",
        paragraphs: [
          "Sprig es solo para personas mayores de 18 años. No tratamos intencionalmente datos de menores de edad.",
        ],
      },
      {
        heading: "10. Cambios y vigencia",
        paragraphs: [
          `Si esta política cambia de forma sustancial te lo informaremos y, cuando corresponda, te pediremos una nueva autorización. Versión vigente: ${LEGAL_VERSION}.`,
        ],
      },
    ],
  },
  cookies: {
    title: "Política de Cookies",
    intro:
      "Sprig solo usa cookies y almacenamiento local estrictamente necesarios para que el servicio funcione. No usamos cookies de analítica, publicidad ni seguimiento de terceros; por eso no te mostramos un banner de consentimiento de cookies.",
    sections: [
      {
        heading: "1. Cookies",
        items: [
          "cm_access_token: mantiene tu sesión activa. Dura 5 minutos. HttpOnly, propia (first-party).",
          "cm_refresh_token: renueva tu sesión sin pedirte la contraseña. Dura hasta 7 días. HttpOnly, propia, solo se envía a las rutas de autenticación.",
        ],
      },
      {
        heading: "2. Almacenamiento local del navegador",
        items: [
          "cm:has-session: indica que ya iniciaste sesión, para restaurarla más rápido. No contiene datos personales.",
          "cost-manager-theme: tu preferencia de tema (claro u oscuro).",
          "cm:locale: tu idioma.",
          'cm:hide-amounts: si activaste "Ocultar montos" (solo una preferencia visual).',
          "cost-manager.fx-rates.v1: copia temporal (24 horas) de tasas de cambio públicas.",
        ],
        paragraphs: [
          "Puedes borrarlos desde la configuración de tu navegador. Si eliminas las cookies de sesión tendrás que iniciar sesión de nuevo.",
        ],
      },
      {
        heading: "3. Terceros",
        paragraphs: [
          "Las fuentes tipográficas se sirven desde el propio sitio. No cargamos scripts de analítica ni de publicidad.",
        ],
      },
      {
        heading: "4. Cambios",
        paragraphs: [
          `Si en el futuro añadimos cookies no esenciales, te pediremos tu consentimiento antes de usarlas. Versión vigente: ${LEGAL_VERSION}.`,
        ],
      },
    ],
  },
  terminos: {
    title: "Términos y Condiciones de Uso",
    intro:
      "Al crear una cuenta o usar Sprig aceptas estos términos. Si no estás de acuerdo, no uses el servicio.",
    sections: [
      {
        heading: "1. Quién presta el servicio",
        paragraphs: [controllerLine],
      },
      {
        heading: "2. El servicio",
        paragraphs: [
          "Sprig es una herramienta para registrar y analizar tus finanzas personales. Los reportes, proyecciones, estimaciones de impuestos y sugerencias son informativos y se calculan con los datos que tú ingresas.",
          "Sprig no es asesoría financiera, de inversión, contable ni tributaria. Para decisiones importantes consulta a un profesional. La información puede tener errores u omisiones: verifícala antes de usarla, por ejemplo en declaraciones de renta.",
        ],
      },
      {
        heading: "3. Tu cuenta",
        items: [
          "Debes ser mayor de 18 años y darnos datos veraces.",
          "Eres responsable de guardar tu contraseña y de la actividad de tu cuenta.",
          "Puedes cerrar tu cuenta cuando quieras solicitándolo a través del correo de contacto.",
        ],
      },
      {
        heading: "4. Uso permitido",
        paragraphs: [
          "No puedes intentar acceder sin autorización a cuentas o sistemas, interferir con el servicio, hacer ingeniería inversa ni usar Sprig para actividades ilícitas.",
        ],
      },
      {
        heading: "5. Cotizaciones y datos de terceros",
        paragraphs: [
          "Las tasas de cambio y cotizaciones provienen de fuentes externas y pueden estar desactualizadas o ser inexactas. No las uses como única base para operar.",
        ],
      },
      {
        heading: "6. Propiedad intelectual",
        paragraphs: [
          "El software, la marca y el diseño de Sprig son de su titular. Tus datos siguen siendo tuyos; nos autorizas a tratarlos solo para prestarte el servicio, según la Política de Tratamiento de Datos Personales.",
        ],
      },
      {
        heading: "7. Limitación de responsabilidad",
        paragraphs: [
          "En la medida permitida por la ley colombiana, no respondemos por pérdidas derivadas de decisiones tomadas con la información de Sprig ni por interrupciones del servicio ajenas a nuestro control. Esto no limita los derechos irrenunciables que tienes como consumidor (Ley 1480 de 2011).",
        ],
      },
      {
        heading: "8. Ley aplicable y cambios",
        paragraphs: [
          `Estos términos se rigen por las leyes de la República de Colombia. Si los modificamos de forma sustancial te lo informaremos y podrás aceptar la nueva versión o cerrar tu cuenta. Versión vigente: ${LEGAL_VERSION}.`,
        ],
      },
    ],
  },
};
