import { useState } from "react";
import { Bell, CheckCheck, Loader2, BellOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/notifications/context";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NotificationPayload } from "@/lib/socket";
import {
  NotificationGroupList,
  NotificationDetailDialog,
  NotificationsDialog,
} from "@/lib/notifications/notification-panel";

export function NotificationBell({ className }: { className?: string }) {
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [selected, setSelected] = useState<NotificationPayload | null>(null);

  function handleSelect(n: NotificationPayload) {
    setMenuOpen(false);
    markRead(n.id);
    setSelected(n);
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "group relative flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface hover:text-foreground",
              className,
            )}
            aria-label="Notificaciones"
          >
            <Bell
              className="h-4.5 w-4.5 transition-transform duration-200 ease-out group-hover:rotate-12"
              size={18}
            />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96">
          <div className="flex items-center justify-between px-3 pb-1 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {unreadCount} sin leer
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  markAllRead();
                }}
                className="flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-xs text-muted-foreground">
              <BellOff className="h-5 w-5 opacity-50" />
              Sin notificaciones
            </div>
          )}
          {!loading && notifications.length > 0 && (
            <ScrollArea className="max-h-96">
              <div className="p-1">
                <NotificationGroupList notifications={notifications} onSelect={handleSelect} />
              </div>
            </ScrollArea>
          )}

          {notifications.length > 0 && (
            <div className="border-t border-border p-1 pt-1.5">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setViewAll(true);
                }}
                className="flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-surface hover:text-foreground"
              >
                Ver todas
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <NotificationsDialog
        open={viewAll}
        onOpenChange={setViewAll}
        notifications={notifications}
        unreadCount={unreadCount}
        onSelect={(n) => {
          markRead(n.id);
          setSelected(n);
        }}
        onMarkAllRead={markAllRead}
      />

      {selected && (
        <NotificationDetailDialog
          key={selected.id}
          notification={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
