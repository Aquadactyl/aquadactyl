import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AccountNotificationsContainer from "./AccountNotificationsContainer";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotifications,
  readNotifications,
  NotificationPreferences,
} from "@/api/account/notifications";

vi.mock("@/api/account/notifications", () => ({
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
  getNotifications: vi.fn(),
  readNotifications: vi.fn(),
}));
vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_: string, fallback: string) => fallback }),
}));
const addFlash = vi.fn();
const clearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({ addFlash, clearAndAddHttpError, clearFlashes: vi.fn() }),
}));
let enabled = true;
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: { data: { uuid: "account-one" } },
      settings: {
        data: {
          name: "Panel",
          blueprint: { disable_attribution: true },
          notifications: { enabled },
        },
      },
    }),
}));
let client: QueryClient;
let preferences: NotificationPreferences;
const row = (id: number, read_at: string | null = null) => ({
  id,
  uuid: `notification-${id}`,
  event: "schedule.complete",
  server_name: "My server",
  server_identifier: "serv_test",
  detail: "Nightly restart",
  created_at: "2026-10-20T10:00:00Z",
  read_at,
});
beforeEach(() => {
  vi.clearAllMocks();
  enabled = true;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  preferences = {
    enabled: true,
    discord_enabled: true,
    has_webhook: false,
    site_events: [],
    discord_events: [],
    events: [
      { id: "power.start", label: "Start requested" },
      { id: "schedule.complete", label: "Schedule completed" },
    ],
  };
  vi.mocked(getNotificationPreferences).mockImplementation(
    async () => preferences,
  );
  vi.mocked(updateNotificationPreferences).mockImplementation(
    async () => preferences,
  );
  vi.mocked(getNotifications).mockResolvedValue({
    data: [],
    unread_count: 0,
    cursor: 0,
    before_id: null,
  });
  vi.mocked(readNotifications).mockResolvedValue(undefined);
});
afterEach(() => client.clear());
const view = () =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AccountNotificationsContainer />
      </MemoryRouter>
    </QueryClientProvider>,
  );
const loaded = () => screen.findByRole("button", { name: "Save preferences" });

it("hides disabled notifications and does not fetch account data", () => {
  enabled = false;
  view();
  expect(
    screen.getByText(
      "Account notifications are disabled by the administrator.",
    ),
  ).toBeDefined();
  expect(getNotificationPreferences).not.toHaveBeenCalled();
  expect(getNotifications).not.toHaveBeenCalled();
});
it("loads opt-in preferences and saves independent site and Discord event selections", async () => {
  const { container } = view();
  expect(container.querySelector("table")).toBeNull();
  await loaded();
  expect(screen.getByText(/You're all caught up/)).toBeDefined();
  fireEvent.click(screen.getByLabelText("Start requested — Site"));
  fireEvent.click(screen.getByLabelText("Schedule completed — Site"));
  fireEvent.click(screen.getByLabelText("Schedule completed — Site"));
  fireEvent.click(screen.getByLabelText("Start requested — Discord"));
  fireEvent.change(screen.getByLabelText("Discord webhook URL"), {
    target: { value: "https://discord.com/api/webhooks/1/private" },
  });
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "password" },
  });
  fireEvent.click(await loaded());
  await waitFor(() =>
    expect(updateNotificationPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        site_events: ["power.start"],
        discord_events: ["power.start"],
        current_password: "password",
      }),
    ),
  );
  await waitFor(() =>
    expect(addFlash).toHaveBeenCalledWith({
      type: "success",
      message: "Notification settings saved.",
    }),
  );
  expect(
    (screen.getByLabelText("Discord webhook URL") as HTMLInputElement).value,
  ).toBe("");
});
it("hides all Discord controls when administrators only permit site notifications", async () => {
  preferences.discord_enabled = false;
  view();
  await loaded();
  expect(screen.queryByLabelText("Discord webhook URL")).toBeNull();
  fireEvent.click(screen.getByLabelText("Start requested — Site"));
  fireEvent.click(await loaded());
  await waitFor(() =>
    expect(updateNotificationPreferences).toHaveBeenCalledWith({
      site_events: ["power.start"],
    }),
  );
});
it("keeps a saved webhook private and supports password-confirmed removal", async () => {
  preferences.has_webhook = true;
  preferences.discord_events = ["power.start"];
  view();
  await loaded();
  expect(
    screen.getByPlaceholderText("Webhook saved — leave blank to keep it"),
  ).toBeDefined();
  fireEvent.click(screen.getByLabelText("Remove saved webhook"));
  expect(
    (screen.getByLabelText("Start requested — Discord") as HTMLInputElement)
      .disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "password" },
  });
  fireEvent.click(await loaded());
  await waitFor(() =>
    expect(updateNotificationPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        clear_webhook: true,
        discord_events: [],
        current_password: "password",
      }),
    ),
  );
});
it("renders a safe inbox, loads older records and marks only selected notifications as read", async () => {
  vi.mocked(getNotifications).mockResolvedValueOnce({
    data: [row(3)],
    unread_count: 1,
    cursor: 3,
    before_id: 3,
  });
  view();
  await loaded();
  expect(
    screen.getByRole("link", { name: "My server" }).getAttribute("href"),
  ).toBe("/server/serv_test");
  vi.mocked(getNotifications).mockResolvedValueOnce({
    data: [{ ...row(2, "2026-10-20T10:00:00Z"), detail: null }],
    unread_count: 1,
    cursor: 2,
    before_id: 2,
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Load older notifications" }),
  );
  await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
  vi.mocked(getNotifications).mockResolvedValueOnce({
    data: [row(1)],
    unread_count: 2,
    cursor: 1,
    before_id: null,
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Load older notifications" }),
  );
  await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
  vi.mocked(getNotifications).mockResolvedValue({
    data: [row(3, "2026-10-20T10:00:00Z")],
    unread_count: 0,
    cursor: 3,
    before_id: null,
  });
  fireEvent.click(screen.getByRole("button", { name: "Mark shown as read" }));
  await waitFor(() =>
    expect(readNotifications).toHaveBeenCalledWith([
      "notification-3",
      "notification-1",
    ]),
  );
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Mark shown as read",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true),
  );
});
it.each(["preferences", "inbox"])(
  "shows a useful error when %s cannot be loaded",
  async (source) => {
    if (source === "preferences")
      vi.mocked(getNotificationPreferences).mockRejectedValue(
        new Error("Network failure"),
      );
    else
      vi.mocked(getNotifications).mockRejectedValue(
        new Error("Network failure"),
      );
    view();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "could not be loaded",
    );
  },
);
it("reports save, read and pagination failures without leaving controls locked", async () => {
  vi.mocked(getNotifications).mockResolvedValue({
    data: [row(1)],
    unread_count: 1,
    cursor: 1,
    before_id: 1,
  });
  vi.mocked(updateNotificationPreferences).mockRejectedValueOnce(
    new Error("Save failed"),
  );
  view();
  await loaded();
  fireEvent.click(await loaded());
  await waitFor(() =>
    expect(clearAndAddHttpError).toHaveBeenCalledWith({
      error: expect.objectContaining({ message: "Save failed" }),
    }),
  );
  vi.mocked(readNotifications).mockRejectedValueOnce(new Error("Read failed"));
  fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
  await waitFor(() =>
    expect(clearAndAddHttpError).toHaveBeenCalledWith({
      error: expect.objectContaining({ message: "Read failed" }),
    }),
  );
  vi.mocked(getNotifications).mockRejectedValueOnce(new Error("Older failed"));
  fireEvent.click(
    screen.getByRole("button", { name: "Load older notifications" }),
  );
  await waitFor(() =>
    expect(clearAndAddHttpError).toHaveBeenCalledWith({
      error: expect.objectContaining({ message: "Older failed" }),
    }),
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Save preferences",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});
