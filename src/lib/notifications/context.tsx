import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  connectSocket,
  disconnectSocket,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATION_EVENTS,
  type NotificationPayload,
} from "@/lib/socket";
import { notificationsApi, type NotificationItem } from "@/lib/api/notifications";
import { useAuth } from "@/lib/auth";

interface NotificationContextType {
  notifications: NotificationPayload[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
  loading: false,
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { userId, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    const loadInitial = async () => {
      setLoading(true);
      try {
        const history = await notificationsApi.getNotifications(userId, { is_active: true });
        if (!cancelled) {
          setNotifications(history.map(toPayload));
        }
      } catch {
        // keep current state if history fails to load
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInitial();

    const socket = connectSocket(Number(userId));

    const handleNewNotification = (payload: NotificationPayload) => {
      setNotifications((prev) =>
        prev.some((n) => n.id === payload.id) ? prev : [payload, ...prev],
      );
    };

    const handleMarkRead = (data: { notification_id: number }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === data.notification_id ? { ...n, is_read: true } : n)),
      );
    };

    const handleMarkAllRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    socket.on(NOTIFICATION_EVENTS.NEW_NOTIFICATION, handleNewNotification);
    socket.on(NOTIFICATION_EVENTS.MARK_READ, handleMarkRead);
    socket.on(NOTIFICATION_EVENTS.MARK_ALL_READ, handleMarkAllRead);

    unsubscribeRef.current = () => {
      socket.off(NOTIFICATION_EVENTS.NEW_NOTIFICATION, handleNewNotification);
      socket.off(NOTIFICATION_EVENTS.MARK_READ, handleMarkRead);
      socket.off(NOTIFICATION_EVENTS.MARK_ALL_READ, handleMarkAllRead);
      disconnectSocket(Number(userId));
    };

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
    };
  }, [isAuthenticated, userId]);

  const markRead = useCallback(
    (id: number) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      if (userId) notificationsApi.markRead(userId, id).catch(() => {});
      markNotificationRead(id);
    },
    [userId],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (userId) notificationsApi.markAllRead(userId).catch(() => {});
    markAllNotificationsRead();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, loading }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

function toPayload(item: NotificationItem): NotificationPayload {
  return {
    id: item.id,
    user_id: item.user_id,
    title: item.title,
    description: item.description,
    is_read: item.is_read,
    is_active: item.is_active,
    scheduled_at: item.scheduled_at,
    reference: item.reference ?? null,
    created_at: item.created_at,
  };
}
