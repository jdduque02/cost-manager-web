import { useState, useMemo } from "react";
import { Loader2, Plus, X, Tag, ShoppingBag, Coffee, Home, Car, Zap, TrendingUp, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useCategories,
  useSubcategories,
  useCreateSubcategory,
  useUpdateSubcategory,
  useDeleteSubcategory,
  useDeleteCategory,
} from "@/lib/hooks/use-api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CategoryDialog } from "./CategoryDialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import type { Category } from "@/lib/api/catalog";

function getCategoryIcon(categoryName?: string) {
  if (!categoryName) return Tag;
  const c = categoryName?.toLowerCase() ?? "";
  if (c.includes("aliment") || c.includes("supermercado") || c.includes("groceries") || c.includes("shopping")) return ShoppingBag;
  if (c.includes("restaurant") || c.includes("dining") || c.includes("cafe") || c.includes("coffee")) return Coffee;
  if (c.includes("vivienda") || c.includes("arriendo") || c.includes("housing") || c.includes("rent")) return Home;
  if (c.includes("transporte") || c.includes("carro") || c.includes("transport") || c.includes("car")) return Car;
  if (c.includes("servicio") || c.includes("utilities") || c.includes("bills")) return Zap;
  if (c.includes("salario") || c.includes("income") || c.includes("ingreso")) return TrendingUp;
  return Tag;
}

function CategoryCard({
  category,
  subcategories,
  onCreateSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onEditCategory,
  onDeleteCategory,
  isCreating,
  isDeleting,
  isUpdatingSub,
}: {
  category: Category;
  subcategories: { id: number; name: string }[];
  onCreateSubcategory: (categoryId: number, name: string) => void;
  onUpdateSubcategory: (id: number, name: string) => void;
  onDeleteSubcategory: (id: number) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  isCreating: boolean;
  isDeleting: boolean;
  isUpdatingSub: boolean;
}) {
  const [newName, setNewName] = useState("");
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editingSubName, setEditingSubName] = useState("");
  const Icon = getCategoryIcon(category.name);

  function handleCreate() {
    if (!newName.trim()) return;
    onCreateSubcategory(category.id, newName.trim());
    setNewName("");
  }

  function handleUpdateSub(id: number) {
    if (!editingSubName.trim()) return;
    onUpdateSubcategory(id, editingSubName.trim());
    setEditingSubId(null);
    setEditingSubName("");
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">{category.name}</p>
          <p className="text-xs text-muted-foreground">
            {subcategories.length} subcategoría{subcategories.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Badge tone="muted">{category.group_type === "income" ? "Ingreso" : "Gasto"}</Badge>
        <div className="flex gap-1">
          <button
            onClick={() => onEditCategory(category)}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDeleteCategory(category)}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {subcategories.length > 0 && (
        <ul className="mt-4 space-y-1">
          {subcategories.map((sub) => (
            <li
              key={sub.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-surface"
            >
              {editingSubId === sub.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editingSubName}
                    onChange={(e) => setEditingSubName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateSub(sub.id);
                      if (e.key === "Escape") {
                        setEditingSubId(null);
                        setEditingSubName("");
                      }
                    }}
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUpdateSub(sub.id)}
                    disabled={!editingSubName.trim() || isUpdatingSub}
                    className="h-7 px-2"
                  >
                    {isUpdatingSub ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Guardar"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingSubId(null);
                      setEditingSubName("");
                    }}
                    className="h-7 px-2"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-foreground">{sub.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingSubId(sub.id);
                        setEditingSubName(sub.name);
                      }}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSubcategory(sub.id)}
                      disabled={isDeleting}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <Input
          placeholder="Nueva subcategoría..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          disabled={!newName.trim() || isCreating}
          className="shrink-0"
        >
          {isCreating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </Card>
  );
}

export function Categories() {
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: allSubcategories = [], isLoading: loadingSubs } = useSubcategories();
  const createSub = useCreateSubcategory();
  const updateSub = useUpdateSubcategory();
  const deleteSub = useDeleteSubcategory();
  const deleteCat = useDeleteCategory();

  const ITEMS_PER_PAGE = 9;

  const [groupFilter, setGroupFilter] = useState<"expense" | "income">("expense");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const filteredCategories = categories.filter((c) => c.group_type === groupFilter);
  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const paginationPages = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  const subcategoriesByCategory = (categoryId: number) =>
    allSubcategories.filter((s) => s.category_id === categoryId);

  function handleCreateSub(categoryId: number, name: string) {
    const id = toast.loading("Creando subcategoría...");
    createSub.mutateAsync(
      { category_id: categoryId, name },
    ).then(() => {
      toast.success("Subcategoría creada", { id });
    }).catch(() => {
      toast.error("Error al crear subcategoría", { id });
    });
  }

  function handleUpdateSub(id: number, name: string) {
    const toastId = toast.loading("Actualizando subcategoría...");
    updateSub.mutateAsync(
      { id, dto: { name } },
    ).then(() => {
      toast.success("Subcategoría actualizada", { id: toastId });
    }).catch(() => {
      toast.error("Error al actualizar subcategoría", { id: toastId });
    });
  }

  function handleDeleteSubConfirm() {
    if (!deleteTarget) return;
    const toastId = toast.loading("Eliminando subcategoría...");
    deleteSub.mutateAsync(deleteTarget.id).then(() => {
      toast.success("Subcategoría eliminada", { id: toastId });
      setDeleteTarget(null);
    }).catch(() => {
      toast.error("Error al eliminar subcategoría", { id: toastId });
    });
  }

  function handleDeleteCategoryConfirm() {
    if (!deleteCategoryTarget) return;
    const toastId = toast.loading("Eliminando categoría...");
    deleteCat.mutateAsync(deleteCategoryTarget.id).then(() => {
      toast.success("Categoría eliminada", { id: toastId });
      setDeleteCategoryTarget(null);
    }).catch(() => {
      toast.error("Error al eliminar la categoría", { id: toastId });
    });
  }

  function handleEditCategory(cat: Category) {
    setEditingCategory(cat);
    setCategoryDialogOpen(true);
  }

  function handleNewCategory() {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  }

  const isLoading = loadingCategories || loadingSubs;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Organización</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Categorías y Subcategorías</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Administra las categorías y subcategorías para clasificar tus transacciones.
          </p>
        </div>
        <button
          onClick={handleNewCategory}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </button>
      </div>

      {/* Group toggle */}
      <div className="grid w-fit grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        {(["expense", "income"] as const).map((g) => (
          <button
            key={g}
            onClick={() => { setGroupFilter(g); setCurrentPage(1); }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              groupFilter === g
                ? g === "expense"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-success/15 text-success"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {g === "expense" ? "Gastos" : "Ingresos"}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center text-muted-foreground text-sm">
          <Tag className="mb-2 h-6 w-6 opacity-50" />
          No hay categorías disponibles.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginatedCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              subcategories={subcategoriesByCategory(cat.id)}
              onCreateSubcategory={handleCreateSub}
              onUpdateSubcategory={handleUpdateSub}
              onDeleteSubcategory={(id) => {
                const sub = allSubcategories.find((s) => s.id === id);
                setDeleteTarget({ id, name: sub?.name ?? "" });
              }}
              onEditCategory={handleEditCategory}
              onDeleteCategory={(cat) => setDeleteCategoryTarget(cat)}
              isCreating={createSub.isPending}
              isDeleting={deleteSub.isPending}
              isUpdatingSub={updateSub.isPending}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {paginationPages.map((page, i) =>
                page === "..." ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Empty state guidance */}
      {!isLoading && allSubcategories.length === 0 && (
        <Card glow className="relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <FolderOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <Badge tone="primary">Configuración inicial</Badge>
              <p className="mt-2 text-base font-medium text-foreground">
                Agrega subcategorías para comenzar a registrar transacciones
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Usa el campo de texto en cada categoría para crear subcategorías como "Almuerzo", "Transporte", "Servicios", etc.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Category Dialog */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={(v) => {
          setCategoryDialogOpen(v);
          if (!v) setEditingCategory(null);
        }}
        category={editingCategory}
      />

      {/* Delete subcategory confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Eliminar subcategoría"
        description={`¿Estás seguro de eliminar "${deleteTarget?.name ?? ""}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteSubConfirm}
        loading={deleteSub.isPending}
      />

      {/* Delete category confirm */}
      <ConfirmDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(v) => { if (!v) setDeleteCategoryTarget(null); }}
        title="Eliminar categoría"
        description={`¿Estás seguro de eliminar "${deleteCategoryTarget?.name ?? ""}"? Esta acción eliminará también todas sus subcategorías y no se puede deshacer.`}
        onConfirm={handleDeleteCategoryConfirm}
        loading={deleteCat.isPending}
      />
    </div>
  );
}
