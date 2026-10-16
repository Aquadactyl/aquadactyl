import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ServerRow from "./ServerRow";
import { Server } from "@/api/server/getServer";
import getServerResourceUsage from "@/api/server/getServerResourceUsage";
import getGameQuery from "@/api/server/getGameQuery";

vi.mock("@/api/server/getServerResourceUsage", () => ({ default: vi.fn() }));
vi.mock("@/api/server/getGameQuery", () => ({ default: vi.fn() }));
vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("a 50-server list fetches and polls resources and players only for visible rows", async () => {
  vi.useFakeTimers();
  const observers = new Map<Element, IntersectionObserverCallback>();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe(element: Element) {
        observers.set(element, this.callback);
      }
      disconnect() {}
    },
  );
  vi.mocked(getServerResourceUsage).mockResolvedValue({
    status: "running",
    isSuspended: false,
    cpuUsagePercent: 1,
    memoryUsageInBytes: 1,
    diskUsageInBytes: 1,
    networkRxInBytes: 1,
    networkTxInBytes: 1,
    uptime: 1,
  });
  vi.mocked(getGameQuery).mockResolvedValue({
    status: "available",
    players: 2,
    maxPlayers: 10,
    checkedAt: new Date(),
  } as any);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const servers = Array.from(
    { length: 50 },
    (_, index) =>
      ({
        id: `serv_${index}` as Server["id"],
        identifier: `serv_${index}` as Server["id"],
        internalId: index,
        uuid: `uuid-${index}`,
        name: `Server ${index}`,
        node: "Local",
        limits: {
          cpu: 100,
          memory: 1024,
          disk: 1024,
          swap: 0,
          io: 500,
          threads: "",
        },
        sftpDetails: { ip: "localhost", port: 2022 },
        invocation: "java",
        dockerImage: "test",
        description: "",
        eggFeatures: [],
        featureLimits: { databases: 0, backups: 0, allocations: 0 },
        skipScripts: false,
        variables: [],
        BlueprintFramework: { eggId: 1 },
        allocations: [],
        status: null,
        gameQueryType: "minecraft",
        isTransferring: false,
        isNodeUnderMaintenance: false,
      }) satisfies Server,
  );
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        {servers.map((server) => (
          <ServerRow key={server.id} server={server} />
        ))}
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(getServerResourceUsage).not.toHaveBeenCalled();
  expect(getGameQuery).not.toHaveBeenCalled();
  const rows = screen.getAllByRole("article");
  const notify = (index: number, visible: boolean) =>
    observers.get(rows[index])!(
      [
        {
          isIntersecting: visible,
          target: rows[index],
          intersectionRatio: visible ? 1 : 0,
          rootBounds: null,
          boundingClientRect: new DOMRect(),
          intersectionRect: new DOMRect(),
          time: 0,
        },
      ],
      {} as IntersectionObserver,
    );
  const settle = async () => {
    for (let i = 0; i < 4; i++)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
  };
  act(() => {
    for (let i = 0; i < 5; i++) notify(i, true);
  });
  await settle();
  expect(getServerResourceUsage).toHaveBeenCalledTimes(5);
  expect(getGameQuery).toHaveBeenCalledTimes(5);

  act(() => {
    for (let i = 0; i < 5; i++) {
      notify(i, false);
      notify(i + 5, true);
    }
  });
  await settle();
  expect(getServerResourceUsage).toHaveBeenCalledTimes(10);
  expect(getGameQuery).toHaveBeenCalledTimes(10);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
  });
  await settle();
  expect(getServerResourceUsage).toHaveBeenCalledTimes(15);
  expect(getGameQuery).toHaveBeenCalledTimes(15);
  expect(
    vi
      .mocked(getServerResourceUsage)
      .mock.calls.slice(10)
      .map(([uuid]) => uuid)
      .sort(),
  ).toEqual(servers.slice(5, 10).map((server) => server.uuid));
  expect(
    vi
      .mocked(getGameQuery)
      .mock.calls.slice(10)
      .map(([uuid]) => uuid)
      .sort(),
  ).toEqual(servers.slice(5, 10).map((server) => server.uuid));
  unmount();
  client.clear();
});
