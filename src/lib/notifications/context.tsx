import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  connectSocket,
  disconnectSocket,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATION_EVENTS,
  type NotificationPayload,
} from "@/lib/socket";
import { useAuth } from "@/lib/auth";

interface NotificationContextType {
  notifications: NotificationPayload[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { userId, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const socket = connectSocket(Number(userId));

    const handleNewNotification = (payload: NotificationPayload) => {
      setNotifications((prev) => [payload, ...prev]);
    };

    const handleMarkRead = (data: { notification_id: number }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === data.notification_id ? { ...n, is_read: true } : n))
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
      unsubscribeRef.current?.();
    };
  }, [isAuthenticated, userId]);

  const markRead = useCallback((id: number) => {
    markNotificationRead(id);
  }, []);

  const markAllRead = useCallback(() => {
    markAllNotificationsRead();
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}
