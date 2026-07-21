import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./client";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api/v1", "") ?? "http://localhost:3000";

export interface NotificationPayload {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  is_read: boolean;
  is_active: boolean;
  scheduled_at: string | null;
  created_at: string;
}

export const NOTIFICATION_EVENTS = {
  NEW_NOTIFICATION: "notification:new",
  MARK_READ: "notification:marked_read",
  MARK_ALL_READ: "notification:all_marked_read",
  SUBSCRIBE: "notification:subscribe",
  UNSUBSCRIBE: "notification:unsubscribe",
  MARK_AS_READ: "notification:mark_read",
  MARK_ALL_AS_READ: "notification:mark_all_read",
} as const;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const token = getAccessToken();
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: false,
  });

  return socket;
}

export function connectSocket(userId: number): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  s.emit(NOTIFICATION_EVENTS.SUBSCRIBE, { user_id: userId });
  return s;
}

export function disconnectSocket(userId: number): void {
  if (!socket) return;
  socket.emit(NOTIFICATION_EVENTS.UNSUBSCRIBE, { user_id: userId });
  socket.disconnect();
  socket = null;
}

export function markNotificationRead(notificationId: number): void {
  if (!socket) return;
  socket.emit(NOTIFICATION_EVENTS.MARK_AS_READ, { notification_id: notificationId });
}

export function markAllNotificationsRead(): void {
  if (!socket) return;
  socket.emit(NOTIFICATION_EVENTS.MARK_ALL_AS_READ);
}
