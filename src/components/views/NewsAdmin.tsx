import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui/primitives";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { newsApi } from "@/lib/api/news";
import type { NewsItem, CreateNewsItemDto } from "@/lib/api/news";
import { Loader2, Plus, Pencil, Trash2, Send, Newspaper, ExternalLink } from "lucide-react";

function NewsForm({
  initial,
  onSave,
  saving,
}: {
  initial?: NewsItem;
  onSave: (dto: CreateNewsItemDto) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [image_url, setImageUrl] = useState(initial?.image_url ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [published_at, setPublishedAt] = useState(() => {
    if (initial?.published_at) {
      return initial.published_at.slice(0, 16);
    }
    return "";
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) {
      toast.error("Título y resumen son obligatorios");
      return;
    }
    onSave({
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim() || null,
      category: category.trim() || null,
      image_url: image_url.trim() || null,
      link: link.trim() || null,
      published_at: published_at ? new Date(published_at).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="news-title">Título *</Label>
        <Input
          id="news-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la noticia"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="news-summary">Resumen *</Label>
        <Input
          id="news-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Resumen breve de la noticia"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="news-content">Contenido</Label>
        <textarea
          id="news-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Contenido detallado (opcional)"
          rows={4}
          className="flex w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="news-category">Categoría</Label>
          <Input
            id="news-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ej. Economía"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="news-published">Fecha de publicación</Label>
          <Input
            id="news-published"
            type="datetime-local"
            value={published_at}
            onChange={(e) => setPublishedAt(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="news-image">URL de imagen</Label>
        <Input
          id="news-image"
          value={image_url}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="news-link">URL del artículo original</Label>
        <Input
          id="news-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {initial ? "Guardar cambios" : "Crear noticia"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function NewsAdmin() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<NewsItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<NewsItem | null>(null);
  const [broadcastItem, setBroadcastItem] = useState<NewsItem | null>(null);

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: () => newsApi.getNews(),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateNewsItemDto) => newsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      setCreateOpen(false);
      toast.success("Noticia creada exitosamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateNewsItemDto> }) =>
      newsApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      setEditItem(null);
      toast.success("Noticia actualizada exitosamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => newsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      setDeleteItem(null);
      toast.success("Noticia eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const broadcastMutation = useMutation({
    mutationFn: ({ subject, htmlBody }: { subject: string; htmlBody: string }) =>
      newsApi.broadcast(subject, htmlBody),
    onSuccess: (result) => {
      toast.success(
        `Correo enviado a ${result.recipients} destinatarios (${result.sent} enviados, ${result.failed} fallidos)`,
      );
      setBroadcastItem(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const newsContent = isLoading && (
    <div className="flex h-40 items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );

  const emptyContent = !isLoading && news.length === 0 && (
    <Card>
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No hay noticias. Crea la primera.
      </div>
    </Card>
  );

  const listContent = !isLoading && news.length > 0 && (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {news.map((item) => (
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
            {item.category && <Badge tone="primary">{item.category}</Badge>}
          </div>
          <h3 className="font-display text-base font-semibold leading-snug">{item.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-3 flex-1">
            {item.summary}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <div className="flex items-center gap-1">
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={() => setBroadcastItem(item)}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                title="Enviar por correo"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setEditItem(item)}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteItem(item)}
                className="rounded-lg p-1.5 text-destructive/70 transition hover:bg-destructive/10 hover:text-destructive"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Administrar</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Gestión de noticias
          </h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva noticia
        </Button>
      </div>

      {newsContent}
      {emptyContent}
      {listContent}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva noticia</DialogTitle>
          </DialogHeader>
          <NewsForm
            onSave={(dto) => createMutation.mutate(dto)}
            saving={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar noticia</DialogTitle>
          </DialogHeader>
          {editItem && (
            <NewsForm
              initial={editItem}
              onSave={(dto) => updateMutation.mutate({ id: editItem.id, dto })}
              saving={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar noticia</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar "<strong>{deleteItem?.title}</strong>"? Esta acción
            no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteItem(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast email dialog */}
      <Dialog open={!!broadcastItem} onOpenChange={(open) => !open && setBroadcastItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar noticia por correo</DialogTitle>
          </DialogHeader>
          {broadcastItem && (
            <BroadcastForm
              newsItem={broadcastItem}
              onSend={(subject, htmlBody) => broadcastMutation.mutate({ subject, htmlBody })}
              saving={broadcastMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BroadcastForm({
  newsItem,
  onSend,
  saving,
}: {
  newsItem: NewsItem;
  onSend: (subject: string, htmlBody: string) => void;
  saving: boolean;
}) {
  const [subject, setSubject] = useState(newsItem.title);
  const [htmlBody, setHtmlBody] = useState(() => {
    const body = newsItem.content || newsItem.summary;
    return `<h1>${newsItem.title}</h1><p>${body}</p>`;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !htmlBody.trim()) {
      toast.error("Asunto y cuerpo son obligatorios");
      return;
    }
    onSend(subject.trim(), htmlBody.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">Se enviará a todos los usuarios registrados.</p>
      <div className="space-y-2">
        <Label htmlFor="broadcast-subject">Asunto</Label>
        <Input
          id="broadcast-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="broadcast-body">Cuerpo HTML</Label>
        <textarea
          id="broadcast-body"
          value={htmlBody}
          onChange={(e) => setHtmlBody(e.target.value)}
          rows={6}
          required
          className="flex w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Usa {"{{name}}"} para el nombre del usuario y {"{{year}}"} para el año actual.
        </p>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Enviar a todos
        </Button>
      </DialogFooter>
    </form>
  );
}
