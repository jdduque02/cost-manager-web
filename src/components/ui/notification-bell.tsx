import { Bell, CheckCheck, Loader2, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/notifications/context";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-CO");
}

export function NotificationBell({ className }: { className?: string }) {
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground",
            className,
          )}
          aria-label="Notificaciones"
        >
          <Bell className="h-4.5 w-4.5" size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-xs text-muted-foreground">
            <BellOff className="h-5 w-5 opacity-50" />
            Sin notificaciones
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="p-1">
              {notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5",
                    !n.is_read && "bg-surface",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.is_read ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    {n.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
