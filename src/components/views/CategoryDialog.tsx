import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCategory, useUpdateCategory } from "@/lib/hooks/use-api";
import type { Category, GroupType, ProfileBucket } from "@/lib/api/catalog";
import { PROFILE_BUCKET_LABELS } from "@/lib/api/catalog";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

const profileBuckets = Object.entries(PROFILE_BUCKET_LABELS) as [ProfileBucket, string][];

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEditing = !!category;
  const isPending = createCategory.isPending || updateCategory.isPending;

  const [name, setName] = useState("");
  const [groupType, setGroupType] = useState<GroupType>("expense");
  const [profileBucket, setProfileBucket] = useState<string>("");

  useEffect(() => {
    if (category) {
      setName(category.name);
      setGroupType(category.group_type);
      setProfileBucket(category.profile_bucket ?? "");
    } else {
      reset();
    }
  }, [category, open]);

  function reset() {
    setName("");
    setGroupType("expense");
    setProfileBucket("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const dto = {
      name: name.trim(),
      group_type: groupType,
      profile_bucket: (profileBucket as ProfileBucket) || undefined,
    };

    if (isEditing) {
      const id = toast.loading("Actualizando categoría...");
      try {
        await updateCategory.mutateAsync({ id: category.id, dto });
        toast.success("Categoría actualizada", { id });
        reset();
        onOpenChange(false);
      } catch {
        toast.error("Error al actualizar la categoría", { id });
      }
    } else {
      const id = toast.loading("Creando categoría...");
      try {
        await createCategory.mutateAsync(dto);
        toast.success("Categoría creada", { id });
        reset();
        onOpenChange(false);
      } catch {
        toast.error("Error al crear la categoría", { id });
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la categoría."
              : "Crea una nueva categoría para organizar tus transacciones."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              placeholder="Ej. Alimentación"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={groupType} onValueChange={(v) => setGroupType(v as GroupType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Gasto</SelectItem>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="investment">Inversión</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Rango del perfil financiero</Label>
            <Select value={profileBucket} onValueChange={(v) => setProfileBucket(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin clasificar" />
              </SelectTrigger>
              <SelectContent>
                {profileBuckets.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!name.trim() || isPending}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
