import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getNotifications } from "@/api/account/notifications";
import NotificationBell from "./NotificationBell";

vi.mock("@/api/account/notifications", () => ({ getNotifications: vi.fn() }));
vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_: string, fallback: string) => fallback }),
}));
let enabled = true;
let user: string | undefined = "account-one";
const addFlash = vi.fn();
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      settings: { data: { notifications: { enabled } } },
      user: { data: { uuid: user } },
      flashes: { addFlash },
    }),
}));
let client: QueryClient;
beforeEach(() => {
  enabled = true;
  user = "account-one";
  vi.useFakeTimers();
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});
afterEach(() => {
  client.clear();
  vi.useRealTimers();
});
const view = () =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
const settle = async (ms = 5) => {
  for (let i = 0; i < 4; i++)
    await act(async () => vi.advanceTimersByTimeAsync(i ? 1 : ms));
};
it("initializes its unread badge without replaying old notifications then toasts only new unread events", async () => {
  vi.mocked(getNotifications).mockResolvedValueOnce({
    data: [],
    unread_count: 110,
    cursor: 8,
    before_id: null,
  });
  view();
  await settle();
  expect(screen.getByText("99+")).toBeDefined();
  expect(addFlash).not.toHaveBeenCalled();
  vi.mocked(getNotifications).mockResolvedValueOnce({
    data: [
      {
        id: 9,
        event: "schedule.complete",
        server_name: "My server",
        detail: "Nightly",
        read_at: null,
      },
      {
        id: 10,
        event: "backup.fail",
        server_name: "My server",
        detail: null,
        read_at: null,
      },
      {
        id: 11,
        event: "server.crash",
        server_name: "My server",
        detail: null,
        read_at: null,
      },
      {
        id: 12,
        event: "power.start",
        server_name: "My server",
        detail: null,
        read_at: "already read",
      },
    ] as any,
    unread_count: 3,
    cursor: 12,
    before_id: null,
  });
  await settle(15000);
  expect(getNotifications).toHaveBeenLastCalledWith({ after_id: 8 });
  expect(addFlash).toHaveBeenCalledTimes(3);
  expect(addFlash).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "info",
      message: "schedule.complete · Nightly",
    }),
  );
  expect(addFlash).toHaveBeenCalledWith(
    expect.objectContaining({ type: "warning", message: "server.crash" }),
  );
});
it.each(["disabled", "signed out"])(
  "does not query or expose a notification link when %s",
  async (condition) => {
    if (condition === "disabled") enabled = false;
    else user = undefined;
    view();
    await settle();
    expect(screen.queryByRole("link")).toBeNull();
    expect(getNotifications).not.toHaveBeenCalled();
  },
);
