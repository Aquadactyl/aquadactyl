import http from "@/api/http";

export interface AccountNotification {
  id: number;
  uuid: string;
  event: string;
  server_name: string;
  server_identifier: string;
  detail: string | null;
  created_at: string;
  read_at: string | null;
}
export interface NotificationPage {
  data: AccountNotification[];
  unread_count: number;
  cursor: number;
  before_id: number | null;
}
export interface NotificationPreferences {
  enabled: boolean;
  discord_enabled: boolean;
  events: { id: string; label: string }[];
  site_events: string[];
  discord_events: string[];
  has_webhook: boolean;
}
export const getNotificationPreferences =
  async (): Promise<NotificationPreferences> =>
    (await http.get("/api/client/account/notifications/preferences")).data;
export const updateNotificationPreferences = async (data: {
  site_events: string[];
  discord_events?: string[];
  discord_webhook?: string;
  clear_webhook?: boolean;
  current_password?: string;
}): Promise<NotificationPreferences> =>
  (await http.put("/api/client/account/notifications/preferences", data)).data;
export const getNotifications = async (params?: {
  after_id?: number;
  before_id?: number;
}): Promise<NotificationPage> =>
  (await http.get("/api/client/account/notifications", { params })).data;
export const readNotifications = async (ids: string[]): Promise<void> => {
  await http.post("/api/client/account/notifications/read", { ids });
};
