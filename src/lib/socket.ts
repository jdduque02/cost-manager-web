import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api/client";

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api/v1", "")
  : "http://localhost:3000";

// El gateway de notificaciones está expuesto en el namespace `/notifications`.
const SOCKET_NAMESPACE = `${SOCKET_URL}/notifications`;

/** Se dispara desde setTokens() cuando el access token rota (refresh HTTP). */
const TOKEN_UPDATED_EVENT = "cm:tokens-updated";

export interface NotificationPayload {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  is_read: boolean;
  is_active: boolean;
  scheduled_at: string | null;
  reference?: string | null;
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
  STATEMENT_IMPORT_PROGRESS: "statement-import:progress",
} as const;

export const NEWS_EVENTS = {
  NEW_NEWS: "news:new",
} as const;

export const STATEMENT_IMPORT_PROGRESS = NOTIFICATION_EVENTS.STATEMENT_IMPORT_PROGRESS;

let socket: Socket | null = null;
let tokenListenerAttached = false;

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(SOCKET_NAMESPACE, {
    // auth como callback: se re-evalúa con el token vigente en cada (re)conexión,
    // así los reintentos usan el token refrescado tras un 401.
    auth: (cb) => cb({ token: getAccessToken() }),
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on("connect_error", (err) => {
    // Token vencido/rechazado: socket.io reintenta con el auth callback, que ya
    // entrega el token actualizado cuando el cliente refresca la sesión.
    console.warn("[socket] connect_error:", err.message);
  });

  if (typeof window !== "undefined" && !tokenListenerAttached) {
    tokenListenerAttached = true;
    window.addEventListener(TOKEN_UPDATED_EVENT, () => {
      const s = socket;
      if (s && s.connected) {
        s.disconnect();
        s.connect();
      }
    });
  }

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
