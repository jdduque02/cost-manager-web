import { useState } from "react";
import { Newspaper, ExternalLink, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { useNews } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

export function News() {
  const { data: news = [], isLoading } = useNews();
  const [page, setPage] = useState(0);
  const perPage = 6;
  const totalPages = Math.ceil(news.length / perPage) || 1;
  const paginated = news.slice(page * perPage, (page + 1) * perPage);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Mantente informado</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Noticias financieras
        </h1>
      </div>

      {news.length === 0 ? (
        <Card>
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No hay noticias disponibles.
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginated.map((item) => (
              <Card key={item.id} className="flex flex-col">
                {item.image_url && (
                  <div className="-mx-5 -mt-5 mb-4 h-40 overflow-hidden rounded-t-2xl">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Newspaper className="h-3.5 w-3.5 text-primary" />
                  {item.category && (
                    <Badge tone="primary">{item.category}</Badge>
                  )}
                </div>
                <h3 className="font-display text-base font-semibold leading-snug">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-3 flex-1">
                  {item.summary || item.content}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.published_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Leer mas <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
