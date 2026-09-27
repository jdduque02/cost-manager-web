import { api } from "./client";

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  is_read: boolean;
  is_active: boolean;
  scheduled_at: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface NotificationQuery {
  is_read?: boolean;
  is_active?: boolean;
}

export const notificationsApi = {
  getNotifications: (userId: string, query?: NotificationQuery) => {
    const qs = query
      ? `?${new URLSearchParams({
          ...(query.is_read !== undefined ? { is_read: String(query.is_read) } : {}),
          ...(query.is_active !== undefined ? { is_active: String(query.is_active) } : {}),
        }).toString()}`
      : "";
    return api.get<NotificationItem[]>(`users/${userId}/notifications${qs}`);
  },
  markRead: (userId: string, id: number) =>
    api.patch<NotificationItem>(`users/${userId}/notifications/${id}/read`, {}),
  markAllRead: (userId: string) =>
    api.patch<NotificationItem[]>(`users/${userId}/notifications/read-all`, {}),
};
