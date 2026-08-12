import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useCreateSubcategory } from "@/lib/hooks/use-api";

interface InlineSubcategoryCreatorProps {
  categoryId: number;
  onCreated: (subcategoryId: number) => void;
}

export function InlineSubcategoryCreator({ categoryId, onCreated }: InlineSubcategoryCreatorProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createSubcategory = useCreateSubcategory();

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    await createSubcategory.mutateAsync(
      { category_id: categoryId, name: trimmed },
      {
        onSuccess: (sub) => {
          toast.success(`Subcategoría "${sub.name}" creada`);
          onCreated(sub.id);
          setName("");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Error al crear la subcategoría");
        },
      },
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        title="Crear subcategoría"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        placeholder="Nombre subcategoría"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCreate();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
          }
        }}
        className="h-9 text-xs"
      />
      <button
        type="button"
        onClick={handleCreate}
        disabled={!name.trim() || createSubcategory.isPending}
        className="inline-flex h-9 items-center rounded-md bg-primary px-2 text-xs text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {createSubcategory.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
        className="inline-flex h-9 items-center rounded-md border border-border px-2 text-xs text-muted-foreground transition hover:bg-accent"
      >
        Cancelar
      </button>
    </div>
  );
}
