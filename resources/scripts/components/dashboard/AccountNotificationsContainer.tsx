import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotifications,
  readNotifications,
  AccountNotification,
} from "@/api/account/notifications";
import { useTanStackQuery } from "@/lib/queryClient";
import { useAppStore } from "@/state";
import useFlash from "@/plugins/useFlash";
import usePanelTranslation from "@/plugins/usePanelTranslation";
import ContentBox from "@/components/elements/ContentBox";
import PageContentBlock from "@/components/elements/PageContentBlock";
import Spinner from "@/components/elements/Spinner";
import Input from "@/components/elements/Input";
import Button from "@/components/elements/Button";

export default function AccountNotificationsContainer() {
  const { t } = usePanelTranslation();
  const enabled = useAppStore(
    (state) => state.settings.data?.notifications?.enabled,
  );
  const { addFlash, clearAndAddHttpError } = useFlash();
  const client = useQueryClient();
  const user = useAppStore((state) => state.user.data?.uuid);
  const { data, error, mutate } = useTanStackQuery(
    enabled ? ["notification-preferences", user] : null,
    getNotificationPreferences,
  );
  const {
    data: inbox,
    error: inboxError,
    mutate: refreshInbox,
  } = useTanStackQuery(
    enabled ? ["notification-inbox", user] : null,
    () => getNotifications(),
    { refetchInterval: 15000 },
  );
  const [siteEvents, setSiteEvents] = useState<string[]>([]);
  const [discordEvents, setDiscordEvents] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [password, setPassword] = useState("");
  const [clear, setClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [older, setOlder] = useState<AccountNotification[]>([]);
  const [before, setBefore] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    if (data) {
      setSiteEvents(data.site_events);
      setDiscordEvents(data.discord_events);
    }
  }, [data]);
  const toggle = (events: string[], event: string) =>
    events.includes(event)
      ? events.filter((value) => value !== event)
      : [...events, event];
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await updateNotificationPreferences({
        site_events: siteEvents,
        ...(data?.discord_enabled
          ? {
              discord_events: clear ? [] : discordEvents,
              discord_webhook: url || undefined,
              clear_webhook: clear,
              current_password: password || undefined,
            }
          : {}),
      });
      await mutate(result, false);
      setUrl("");
      setPassword("");
      setClear(false);
      addFlash({
        type: "success",
        message: t("notifications.saved", "Notification settings saved."),
      });
    } catch (error) {
      clearAndAddHttpError({ error });
    } finally {
      setBusy(false);
    }
  };
  const markRead = async (ids: string[]) => {
    setBusy(true);
    try {
      await readNotifications(ids);
      setOlder((rows) =>
        rows.map((row) =>
          ids.includes(row.uuid)
            ? { ...row, read_at: new Date().toISOString() }
            : row,
        ),
      );
      await refreshInbox();
      await client.invalidateQueries({
        queryKey: ["account-notifications", user],
      });
    } catch (error) {
      clearAndAddHttpError({ error });
    } finally {
      setBusy(false);
    }
  };
  const loadOlder = async () => {
    setBusy(true);
    try {
      const page = await getNotifications({
        before_id: (before === undefined ? inbox?.before_id : before)!,
      });
      setOlder((rows) => [...rows, ...page.data]);
      setBefore(page.before_id);
    } catch (error) {
      clearAndAddHttpError({ error });
    } finally {
      setBusy(false);
    }
  };
  const rows = [
    ...new Map(
      [...(inbox?.data || []), ...older].map((row) => [row.uuid, row]),
    ).values(),
  ];
  if (!enabled)
    return (
      <PageContentBlock title={t("navigation.notifications", "Notifications")}>
        <p>
          {t(
            "notifications.disabled",
            "Account notifications are disabled by the administrator.",
          )}
        </p>
      </PageContentBlock>
    );
  return (
    <PageContentBlock title={t("navigation.notifications", "Notifications")}>
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">
            {t("account.your_account", "Your account")}
          </p>
          <h1 className="page-title">
            {t("navigation.notifications", "Notifications")}
          </h1>
          <p className="page-description">
            {t(
              "notifications.description",
              "Choose which server events reach your inbox and Discord.",
            )}
          </p>
        </div>
      </div>
      {error || inboxError ? (
        <p role="alert">
          {t(
            "notifications.load_failed",
            "Notifications could not be loaded. Please try again.",
          )}
        </p>
      ) : !data ? (
        <Spinner centered />
      ) : (
        <>
          <ContentBox
            title={t("notifications.preferences", "Notification preferences")}
          >
            <form onSubmit={save}>
              <p className="mb-4 text-sm text-gray-400">
                {t(
                  "notifications.scope",
                  "Applies to servers you own and shared servers where you have the relevant permissions. All events are opt-in.",
                )}
              </p>
              <table className="notification-preferences">
                <thead>
                  <tr>
                    <th scope="col">{t("notifications.event", "Event")}</th>
                    <th scope="col">{t("notifications.site", "Site")}</th>
                    {data.discord_enabled && <th scope="col">Discord</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((event) => (
                    <tr key={event.id}>
                      <th scope="row">
                        {t(`notifications.events.${event.id}`, event.label)}
                      </th>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${event.label} — ${t("notifications.site", "Site")}`}
                          checked={siteEvents.includes(event.id)}
                          onChange={() =>
                            setSiteEvents(toggle(siteEvents, event.id))
                          }
                        />
                      </td>
                      {data.discord_enabled && (
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${event.label} — Discord`}
                            checked={discordEvents.includes(event.id)}
                            disabled={clear}
                            onChange={() =>
                              setDiscordEvents(toggle(discordEvents, event.id))
                            }
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="my-4 text-xs text-gray-400">
                {t(
                  "notifications.crash_help",
                  "Crash alerts require crash reporting from your daemon. Stock Wings does not report this event.",
                )}
              </p>
              {data.discord_enabled && (
                <div className="my-5 space-y-4">
                  <div>
                    <label
                      htmlFor="notification-webhook"
                      className="mb-2 block text-sm"
                    >
                      {t("notifications.webhook", "Discord webhook URL")}
                    </label>
                    <Input
                      id="notification-webhook"
                      type="password"
                      autoComplete="new-password"
                      value={url}
                      disabled={clear}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder={
                        data.has_webhook
                          ? t(
                              "notifications.webhook_saved",
                              "Webhook saved — leave blank to keep it",
                            )
                          : "https://discord.com/api/webhooks/…"
                      }
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      {t(
                        "notifications.webhook_help",
                        "Only event names, server names, schedule names and timestamps are sent. Your webhook URL is encrypted and never displayed again.",
                      )}
                    </p>
                  </div>
                  {data.has_webhook && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={clear}
                        onChange={(event) => setClear(event.target.checked)}
                      />
                      {t(
                        "notifications.remove_webhook",
                        "Remove saved webhook",
                      )}
                    </label>
                  )}
                  {(url || clear) && (
                    <div>
                      <label
                        htmlFor="notification-password"
                        className="mb-2 block text-sm"
                      >
                        {t("notifications.password", "Current password")}
                      </label>
                      <Input
                        id="notification-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={busy} isLoading={busy}>
                  {t("notifications.save", "Save preferences")}
                </Button>
              </div>
            </form>
          </ContentBox>
          <div className="mt-6">
            <ContentBox title={t("notifications.inbox", "Your inbox")}>
              {rows.length ? (
                <>
                  <div className="mb-4 flex justify-end">
                    <Button
                      size="small"
                      disabled={busy || !rows.some((row) => !row.read_at)}
                      onClick={() =>
                        markRead(
                          rows
                            .filter((row) => !row.read_at)
                            .map((row) => row.uuid)
                            .slice(0, 100),
                        )
                      }
                    >
                      {t(
                        "notifications.mark_visible_read",
                        "Mark shown as read",
                      )}
                    </Button>
                  </div>
                  <div className="notification-list">
                    {rows.map((row) => (
                      <article
                        className="notification-entry"
                        data-unread={!row.read_at}
                        key={row.uuid}
                      >
                        <Bell size={18} aria-hidden />
                        <div className="notification-entry-copy">
                          <Link
                            to={`/server/${row.server_identifier}`}
                            className="font-semibold"
                          >
                            {row.server_name}
                          </Link>
                          <p className="text-sm">
                            {t(`notifications.events.${row.event}`, row.event)}
                            {row.detail ? ` · ${row.detail}` : ""}
                          </p>
                          <time dateTime={row.created_at}>
                            {new Date(row.created_at).toLocaleString()}
                          </time>
                        </div>
                        {!row.read_at && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => markRead([row.uuid])}
                          >
                            {t("notifications.mark_read", "Mark read")}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                  {(before === undefined ? inbox?.before_id : before) && (
                    <div className="mt-4">
                      <Button size="small" disabled={busy} onClick={loadOlder}>
                        {t(
                          "notifications.load_older",
                          "Load older notifications",
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-gray-400">
                  <Bell size={28} className="mx-auto mb-3" aria-hidden />
                  <p>
                    {t(
                      "notifications.empty",
                      "You're all caught up. Selected server events will appear here.",
                    )}
                  </p>
                </div>
              )}
            </ContentBox>
          </div>
        </>
      )}
    </PageContentBlock>
  );
}
