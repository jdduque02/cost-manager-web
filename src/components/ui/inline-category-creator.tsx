import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useCreateCategory } from "@/lib/hooks/use-api";
import type { GroupType } from "@/lib/api/catalog";

interface InlineCategoryCreatorProps {
  groupType: GroupType;
  onCreated: (categoryId: number) => void;
}

export function InlineCategoryCreator({ groupType, onCreated }: InlineCategoryCreatorProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createCategory = useCreateCategory();

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    await createCategory.mutateAsync(
      { name: trimmed, group_type: groupType },
      {
        onSuccess: (cat) => {
          toast.success(`Categoría "${cat.name}" creada`);
          onCreated(cat.id);
          setName("");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Error al crear la categoría");
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
        title="Crear categoría"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        placeholder="Nombre categoría"
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
        disabled={!name.trim() || createCategory.isPending}
        className="inline-flex h-9 items-center rounded-md bg-primary px-2 text-xs text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {createCategory.isPending ? (
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
