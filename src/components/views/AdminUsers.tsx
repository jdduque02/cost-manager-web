import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Shield,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  KeyRound,
  Power,
  PowerOff,
  LogOut,
  Circle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { adminApi, type AdminUserQuery } from "@/lib/api/admin";
import type { User } from "@/lib/api/identity";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;

export function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [role, setRole] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query: AdminUserQuery = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      role: role === "all" ? undefined : role,
      is_active: status === "all" ? undefined : status === "active",
      sortBy: "last_login_at",
      order: "DESC",
    }),
    [page, search, role, status],
  );

  const listQuery = useQuery({
    queryKey: ["admin-users", query],
    queryFn: () => adminApi.getUsers(query),
    staleTime: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: ["admin-user", selectedId],
    queryFn: () => adminApi.getUserDetail(selectedId!),
    enabled: !!selectedId,
    staleTime: 15_000,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    if (selectedId) void qc.invalidateQueries({ queryKey: ["admin-user", selectedId] });
  };

  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateStatus(id, is_active),
    onSuccess: () => {
      toast.success("Estado actualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rolesMut = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) => adminApi.updateRoles(id, roles),
    onSuccess: () => {
      toast.success("Roles actualizados");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: (id: string) => adminApi.resetPassword(id),
    onSuccess: () => toast.success("Email de restablecimiento enviado"),
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeAllMut = useMutation({
    mutationFn: (id: string) => adminApi.revokeAllSessions(id),
    onSuccess: () => {
      toast.success("Sesiones revocadas");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeOneMut = useMutation({
    mutationFn: ({ id, sessionId }: { id: string; sessionId: string }) =>
      adminApi.revokeSession(id, sessionId),
    onSuccess: () => {
      toast.success("Sesión revocada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function formatLastLogin(value?: string | null) {
    if (!value) return "Nunca";
    try {
      return formatDistanceToNow(new Date(value), { addSuffix: true, locale: es });
    } catch {
      return value;
    }
  }

  function toggleAdmin(user: User) {
    const roles = new Set(user.roles ?? ["user"]);
    if (roles.has("admin")) roles.delete("admin");
    else roles.add("admin");
    roles.add("user");
    rolesMut.mutate({ id: user.id, roles: [...roles] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Administración de usuarios activos, roles, sesiones y metadata."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={applySearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por usuario o email…"
            className="pl-9"
          />
        </form>
        <Select
          value={role}
          onValueChange={(v) => {
            setRole(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => listQuery.refetch()} title="Recargar">
          <RefreshCw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última conexión</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key -- static skeleton rows never reorder
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!listQuery.isLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id} className="cursor-pointer" onClick={() => setSelectedId(u.id)}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{u.username}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(u.roles?.length ? u.roles : ["user"]).map((r) => (
                      <Badge
                        key={r}
                        variant={r === "admin" ? "default" : "secondary"}
                        className="text-[10px] uppercase"
                      >
                        {r === "admin" ? (
                          <span className="inline-flex items-center gap-1">
                            <Shield className="h-3 w-3" /> admin
                          </span>
                        ) : (
                          r
                        )}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Circle
                      className={cn(
                        "h-2.5 w-2.5 fill-current",
                        u.is_online ? "text-emerald-500" : "text-muted-foreground/40",
                      )}
                    />
                    <span className="text-sm">
                      {u.is_active ? "Activo" : "Inactivo"}
                      {u.is_online ? " · online" : ""}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatLastLogin(u.last_login_at)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("es-CO") : "—"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedId(u.id)}>
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toggleAdmin(u)}>
                        <Shield className="mr-2 h-4 w-4" />
                        {u.roles?.includes("admin") ? "Quitar admin" : "Hacer admin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => statusMut.mutate({ id: u.id, is_active: !u.is_active })}
                      >
                        {u.is_active ? (
                          <>
                            <PowerOff className="mr-2 h-4 w-4" /> Desactivar
                          </>
                        ) : (
                          <>
                            <Power className="mr-2 h-4 w-4" /> Activar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => resetMut.mutate(u.id)}>
                        <KeyRound className="mr-2 h-4 w-4" /> Reset password
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => revokeAllMut.mutate(u.id)}>
                        <LogOut className="mr-2 h-4 w-4" /> Revocar sesiones
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} usuario{total === 1 ? "" : "s"} · página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de usuario</DialogTitle>
            <DialogDescription>
              Metadata, PII (admin), sesiones activas e historial de acceso.
            </DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {detailQuery.data && (
            <div className="space-y-5">
              <section className="grid gap-3 sm:grid-cols-2">
                <Field label="Usuario" value={detailQuery.data.user.username} />
                <Field label="Email" value={detailQuery.data.user.email} />
                <Field label="Nombre" value={detailQuery.data.user.full_name ?? "—"} />
                <Field label="Teléfono" value={detailQuery.data.user.phone ?? "—"} />
                <Field label="Documento" value={detailQuery.data.user.document_id ?? "—"} />
                <Field label="Dirección" value={detailQuery.data.user.address ?? "—"} />
                <Field
                  label="Última conexión"
                  value={formatLastLogin(detailQuery.data.user.last_login_at)}
                />
                <Field
                  label="Estado"
                  value={`${detailQuery.data.user.is_active ? "Activo" : "Inactivo"}${
                    detailQuery.data.user.is_online ? " · online" : ""
                  }`}
                />
              </section>

              <section>
                <h4 className="mb-2 text-sm font-semibold">Roles</h4>
                <div className="flex flex-wrap gap-1">
                  {(detailQuery.data.user.roles ?? []).map((r) => (
                    <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                      {r}
                    </Badge>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-sm font-semibold">Metadata</h4>
                <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {JSON.stringify(detailQuery.data.user.metadata ?? {}, null, 2)}
                </pre>
              </section>

              {detailQuery.data.user.financial_profile && (
                <section>
                  <h4 className="mb-2 text-sm font-semibold">Perfil financiero</h4>
                  <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {JSON.stringify(detailQuery.data.user.financial_profile, null, 2)}
                  </pre>
                </section>
              )}

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    Sesiones activas ({detailQuery.data.sessions.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revokeAllMut.mutate(detailQuery.data.user.id)}
                    disabled={revokeAllMut.isPending}
                  >
                    Revocar todas
                  </Button>
                </div>
                <div className="space-y-2">
                  {detailQuery.data.sessions.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin sesiones activas.</p>
                  )}
                  {detailQuery.data.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{s.ipAddress ?? "IP desconocida"}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.browser || "—"} · lastAccess{" "}
                          {(() => {
                            if (!s.lastAccess) return "—";
                            const lastAccessDate =
                              typeof s.lastAccess === "number"
                                ? new Date(s.lastAccess).toISOString()
                                : s.lastAccess;
                            return formatLastLogin(lastAccessDate);
                          })()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          revokeOneMut.mutate({
                            id: detailQuery.data.user.id,
                            sessionId: s.id,
                          })
                        }
                      >
                        Revocar
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-sm font-semibold">Historial de accesos</h4>
                <div className="max-h-48 space-y-1 overflow-auto">
                  {detailQuery.data.accessHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin eventos.</p>
                  )}
                  {detailQuery.data.accessHistory.slice(0, 30).map((ev, i) => (
                    <div
                      key={`${ev.type}-${ev.time}`}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5 text-xs"
                    >
                      <span className="font-medium">{ev.type ?? "event"}</span>
                      <span className="text-muted-foreground">
                        {ev.ipAddress ?? "—"} ·{" "}
                        {ev.time ? new Date(ev.time).toLocaleString("es-CO") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-all">{value}</p>
    </div>
  );
}
