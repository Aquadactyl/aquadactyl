import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import ServerRow from "./ServerRow";
import { Server } from "@/api/server/getServer";
import getServerResourceUsage, {
  ServerPowerState,
} from "@/api/server/getServerResourceUsage";
import sendServerPowerAction from "@/api/server/sendServerPowerAction";

vi.mock("@/api/server/getServerResourceUsage", () => ({ default: vi.fn() }));
vi.mock("@/api/server/sendServerPowerAction", () => ({ default: vi.fn() }));
vi.mock("./ServerPlayerCount", () => ({ default: () => null }));
vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
let visible = true;
vi.mock("@/plugins/useViewportVisibility", () => ({ default: () => visible }));

const server = {
  id: "serv_power",
  uuid: "uuid-power",
  name: "Power test",
  node: "Local",
  limits: { cpu: 100, memory: 1024, disk: 1024 },
  allocations: [],
  userPermissions: ["*"],
  status: null,
} as unknown as Server;
let state: ServerPowerState;
let client: QueryClient;

beforeEach(() => {
  vi.useFakeTimers();
  visible = true;
  state = "offline";
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  vi.mocked(sendServerPowerAction).mockResolvedValue(undefined);
  vi.mocked(getServerResourceUsage).mockImplementation(async () => ({
    status: state,
    isSuspended: false,
    cpuUsagePercent: 1,
    memoryUsageInBytes: 1,
    diskUsageInBytes: 1,
    networkRxInBytes: 0,
    networkTxInBytes: 0,
    uptime: 1,
  }));
});
afterEach(() => {
  client.clear();
  focusManager.setFocused(undefined);
  vi.useRealTimers();
  vi.clearAllMocks();
});

const settle = async (milliseconds = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
  }
};
const view = () => (
  <QueryClientProvider client={client}>
    <MemoryRouter>
      <ServerRow server={server} />
    </MemoryRouter>
  </QueryClientProvider>
);
const badge = () =>
  document.querySelector(".server-state")!.getAttribute("data-state");

it.each(["start", "restart", "stop"] as const)(
  "keeps checking after %s until a delayed daemon state changes",
  async (action) => {
    state = action === "start" ? "offline" : "running";
    render(view());
    await settle();
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`^${action} `, "i") }),
    );
    await settle();
    expect(sendServerPowerAction).toHaveBeenCalledWith(server.uuid, action);
    expect(badge()).toBe(action === "stop" ? "stopping" : "starting");

    // The first check still sees the old state. It must not end fast polling.
    await settle(1600);
    expect(badge()).toBe(state);
    state = action === "stop" ? "stopping" : "starting";
    await settle(2000);
    expect(badge()).toBe(state);
    state = action === "stop" ? "offline" : "running";
    await settle(2000);
    expect(badge()).toBe(state);
    await settle(60000);
    const calls = vi.mocked(getServerResourceUsage).mock.calls.length;
    await settle(2000);
    expect(getServerResourceUsage).toHaveBeenCalledTimes(calls);
  },
);

it.each(["starting", "stopping"] as const)(
  "polls existing %s states promptly without a local power action",
  async (status) => {
    state = status;
    render(view());
    await settle();
    state = status === "starting" ? "running" : "offline";
    await settle(2100);
    expect(badge()).toBe(state);
  },
);

it("refreshes cached status immediately on returning to a visible row", async () => {
  client.setQueryData(["server-resources", server.uuid], {
    status: "offline",
    cpuUsagePercent: 0,
    memoryUsageInBytes: 0,
    diskUsageInBytes: 0,
  });
  visible = false;
  state = "running";
  const { rerender } = render(view());
  await settle();
  expect(getServerResourceUsage).not.toHaveBeenCalled();
  visible = true;
  rerender(view());
  await settle();
  expect(badge()).toBe("running");
});

it("pauses fast polling offscreen and resumes with fresh state", async () => {
  const { rerender } = render(view());
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "Start Power test" }));
  await settle(1600);
  visible = false;
  rerender(view());
  const calls = vi.mocked(getServerResourceUsage).mock.calls.length;
  state = "running";
  await settle(10000);
  expect(getServerResourceUsage).toHaveBeenCalledTimes(calls);
  visible = true;
  rerender(view());
  await settle();
  expect(badge()).toBe("running");
});

it("refreshes a visible server when returning to the browser tab", async () => {
  render(view());
  await settle();
  expect(badge()).toBe("offline");
  focusManager.setFocused(false);
  state = "running";
  await act(async () => {
    focusManager.setFocused(true);
  });
  await settle();
  expect(badge()).toBe("running");
});

it("reports a rejected power action without claiming the server is starting", async () => {
  vi.mocked(sendServerPowerAction).mockRejectedValueOnce(
    new Error("Daemon refused action"),
  );
  render(view());
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "Start Power test" }));
  await settle(1600);
  expect(screen.getByRole("alert").textContent).toContain(
    "Daemon refused action",
  );
  expect(badge()).toBe("offline");
  const calls = vi.mocked(getServerResourceUsage).mock.calls.length;
  await settle(4000);
  expect(getServerResourceUsage).toHaveBeenCalledTimes(calls);
});
