import React, { useRef } from "react";
import { Bell } from "lucide-react";
import { NavLink } from "react-router";
import { useAppStore } from "@/state";
import { useTanStackQuery } from "@/lib/queryClient";
import { getNotifications } from "@/api/account/notifications";
import usePanelTranslation from "@/plugins/usePanelTranslation";

export default function NotificationBell() {
  const { t } = usePanelTranslation();
  const user = useAppStore((state) => state.user.data?.uuid);
  const enabled = useAppStore(
    (state) => state.settings.data?.notifications?.enabled,
  );
  const addFlash = useAppStore((state) => state.flashes.addFlash);
  const cursor = useRef<number | undefined>(undefined);
  const { data } = useTanStackQuery(
    enabled && user ? ["account-notifications", user] : null,
    async () => {
      const page = await getNotifications(
        cursor.current === undefined ? undefined : { after_id: cursor.current },
      );
      const show = cursor.current !== undefined;
      cursor.current = page.cursor;
      if (show) {
        page.data
          .filter((item) => !item.read_at)
          .forEach((item) =>
            addFlash({
              type:
                item.event.endsWith("fail") || item.event === "server.crash"
                  ? "warning"
                  : "info",
              title: item.server_name,
              message:
                t(`notifications.events.${item.event}`, item.event) +
                (item.detail ? ` · ${item.detail}` : ""),
            }),
          );
      }
      return page;
    },
    { refetchInterval: 15000, refetchOnWindowFocus: true },
  );
  if (!enabled || !user) return null;
  return (
    <NavLink
      to="/account/notifications"
      className="notification-bell"
      aria-label={t("navigation.notifications", "Notifications")}
      title={t("navigation.notifications", "Notifications")}
    >
      <Bell size={18} aria-hidden />
      {!!data?.unread_count && (
        <span className="notification-badge">
          {Math.min(data.unread_count, 99)}
          {data.unread_count > 99 ? "+" : ""}
        </span>
      )}
    </NavLink>
  );
}
