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
import { useCategories, useCreateEmpresa, useUpdateEmpresa } from "@/lib/hooks/use-api";
import type { Empresa } from "@/lib/api/empresas";

interface EmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: Empresa | null;
  onCreated?: (empresa: Empresa) => void;
}

export function EmpresaDialog({ open, onOpenChange, empresa, onCreated }: EmpresaDialogProps) {
  const { data: categories = [] } = useCategories();
  const createEmpresa = useCreateEmpresa();
  const updateEmpresa = useUpdateEmpresa();

  const isEditing = !!empresa;
  const isPending = createEmpresa.isPending || updateEmpresa.isPending;

  const [name, setName] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>("");

  useEffect(() => {
    if (empresa) {
      setName(empresa.name);
      setDefaultCategoryId(empresa.default_category_id ? String(empresa.default_category_id) : "");
    } else {
      reset();
    }
  }, [empresa, open]);

  function reset() {
    setName("");
    setDefaultCategoryId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const dto = {
      name: name.trim(),
      default_category_id: defaultCategoryId ? Number(defaultCategoryId) : undefined,
    };

    if (isEditing) {
      const id = toast.loading("Actualizando empresa...");
      try {
        await updateEmpresa.mutateAsync({ id: empresa.id, dto });
        toast.success("Empresa actualizada", { id });
        reset();
        onOpenChange(false);
      } catch {
        toast.error("Error al actualizar la empresa", { id });
      }
    } else {
      const id = toast.loading("Creando empresa...");
      try {
        const result = await createEmpresa.mutateAsync(dto);
        const created = Array.isArray(result) ? result[0] : result;
        toast.success("Empresa creada", { id });
        reset();
        onOpenChange(false);
        onCreated?.(created);
      } catch {
        toast.error("Error al crear la empresa", { id });
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
          <DialogTitle>{isEditing ? "Editar Empresa" : "Nueva Empresa"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la empresa."
              : "Registra una nueva empresa para agrupar transacciones."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              placeholder="Ej. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoría por defecto (opcional)</Label>
            <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría por defecto" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se asigna automáticamente al crear transacciones con esta empresa.
            </p>
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
