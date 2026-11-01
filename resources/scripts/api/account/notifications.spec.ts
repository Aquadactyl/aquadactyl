import http from "@/api/http";
import {
  getNotifications,
  readNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "./notifications";

vi.mock("@/api/http", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

it("uses account-scoped notification endpoints and passes cursors and preferences without exposing secrets in URLs", async () => {
  vi.mocked(http.get).mockResolvedValue({ data: { data: [], enabled: true } });
  vi.mocked(http.put).mockResolvedValue({ data: { has_webhook: true } });
  vi.mocked(http.post).mockResolvedValue({});
  await getNotifications();
  await getNotifications({ after_id: 12 });
  await getNotifications({ before_id: 8 });
  await getNotificationPreferences();
  const payload = {
    site_events: [],
    discord_webhook: "https://discord.com/api/webhooks/1/secret",
  };
  expect(await updateNotificationPreferences(payload)).toEqual({
    has_webhook: true,
  });
  await readNotifications(["notification-id"]);
  expect(http.get).toHaveBeenCalledWith("/api/client/account/notifications", {
    params: { after_id: 12 },
  });
  expect(http.put).toHaveBeenCalledWith(
    "/api/client/account/notifications/preferences",
    payload,
  );
  expect(http.post).toHaveBeenCalledWith(
    "/api/client/account/notifications/read",
    { ids: ["notification-id"] },
  );
});
