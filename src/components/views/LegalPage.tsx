import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LEGAL_DOCS, LEGAL_VERSION, type LegalSlug } from "@/content/legal";

const LINKS: { slug: LegalSlug; to: "/privacidad" | "/cookies" | "/terminos"; label: string }[] = [
  { slug: "privacidad", to: "/privacidad", label: "Privacidad" },
  { slug: "cookies", to: "/cookies", label: "Cookies" },
  { slug: "terminos", to: "/terminos", label: "Términos" },
];

export function LegalPage({ slug }: { slug: LegalSlug }) {
  const doc = LEGAL_DOCS[slug];

  return (
    <div className="relative min-h-screen px-4 py-10 sm:px-6">
      <main id="main" className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </Link>

        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Versión {LEGAL_VERSION}</p>
        <p className="mt-4 text-base leading-relaxed">{doc.intro}</p>

        {doc.sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="font-display text-xl font-semibold tracking-tight">{s.heading}</h2>
            {s.paragraphs?.map((p) => (
              <p key={p} className="mt-3 text-sm leading-relaxed">
                {p}
              </p>
            ))}
            {s.items && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                {s.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <nav
          aria-label="Documentos legales"
          className="mt-12 flex gap-6 border-t border-border pt-6"
        >
          {LINKS.filter((l) => l.slug !== slug).map((l) => (
            <Link
              key={l.slug}
              to={l.to}
              className="text-sm font-medium text-primary hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
