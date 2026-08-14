import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Newspaper, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { useNews } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

export function NewsCarousel() {
  const { data: news = [], isLoading } = useNews(10);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((i) => (news.length > 0 ? (i + 1) % news.length : 0));
  }, [news.length]);

  const prev = useCallback(() => {
    setIndex((i) => (news.length > 0 ? (i - 1 + news.length) % news.length : 0));
  }, [news.length]);

  useEffect(() => {
    if (paused || news.length <= 1) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, paused, news.length]);

  if (isLoading) {
    return (
      <Card>
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  if (news.length === 0) return null;

  const current = news[index];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Card className="relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">Noticias</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {index + 1} / {news.length}
          </span>
        </div>

        <div className="min-h-[80px]">
          <div className="flex items-start gap-2">
            {current.category && (
              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {current.category}
              </span>
            )}
            <h4 className="text-sm font-semibold leading-snug">{current.title}</h4>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {current.summary || current.content}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground">
              {new Date(current.published_at).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            {current.link && (
              <a
                href={current.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
              >
                Ver mas <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </div>

        {news.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute bottom-3 left-3 rounded-md bg-surface/80 p-1 text-muted-foreground backdrop-blur transition hover:bg-surface hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={next}
              className="absolute bottom-3 right-3 rounded-md bg-surface/80 p-1 text-muted-foreground backdrop-blur transition hover:bg-surface hover:text-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <div className="mt-3 flex justify-center gap-1">
          {news.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1 rounded-full transition-all duration-200 ease-out",
                i === index
                  ? "w-4 bg-primary"
                  : "w-1 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
