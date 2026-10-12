import { act, render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ServerDetailsBlock from "./ServerDetailsBlock";
import { ServerContext } from "@/state/server";
import { SocketRequest } from "@/components/server/events";

let websocketCallback: ((data: string) => void) | null = null;
vi.mock("@/plugins/useWebsocketEvent", () => ({
  default: (_event: any, callback: any) => {
    websocketCallback = callback;
  },
}));

vi.mock("@blueprint/components/Server/Terminal/BeforeInformation", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Terminal/AfterInformation", () => ({
  default: () => null,
}));

interface WrapperProps {
  children: React.ReactNode;
  status?: string | null;
  limits?: any;
  allocations?: any[];
  connected?: boolean;
  mockSocketSend?: (req: any) => void;
}

const Wrapper = ({
  children,
  status = "running",
  limits,
  allocations,
  connected = false,
  mockSocketSend,
}: WrapperProps) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setServerStatus = ServerContext.useStoreActions(
    (a) => a.status.setServerStatus,
  );
  const setSocketConnected = ServerContext.useStoreActions(
    (a) => a.socket.setConnectionState,
  );
  const setSocketInstance = ServerContext.useStoreActions(
    (a) => a.socket.setInstance,
  );

  useEffect(() => {
    setServer({
      id: "serv_1" as any,
      uuid: "server-uuid-1",
      name: "Test Server",
      node: "Node 1",
      isNodeUnderMaintenance: false,
      status: null,
      invocation: "start",
      dockerImage: "java",
      sftpDetails: { ip: "127.0.0.1", port: 2022 },
      description: "",
      limits: limits || {
        memory: 2048,
        swap: 0,
        disk: 5120,
        io: 500,
        cpu: 200,
        threads: "",
      },
      featureLimits: { databases: 1, allocations: 1, backups: 1 },
      isTransferring: false,
      eggFeatures: [],
      allocations: allocations || [
        {
          id: 1,
          ip: "127.0.0.1",
          alias: "play.example.com",
          port: 25565,
          notes: "",
          isDefault: true,
        },
      ],
      variables: [],
    } as any);
    setServerStatus(status as any);
    if (connected && mockSocketSend) {
      setSocketInstance({
        send: mockSocketSend,
        removeAllListeners: vi.fn(),
        close: vi.fn(),
      } as any);
      setSocketConnected(true);
    }
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/console/ServerDetailsBlock", () => {
  beforeEach(() => {
    websocketCallback = null;
  });

  it("renders address, status/uptime, CPU and memory blocks", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <ServerDetailsBlock />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("Address")).toBeDefined();
    expect(screen.getByText("play.example.com:25565")).toBeDefined();
    expect(screen.getByText("Uptime")).toBeDefined();
    expect(screen.getByText("CPU Load")).toBeDefined();
    expect(screen.getByText("Memory")).toBeDefined();
    expect(screen.getByText("Disk")).toBeDefined();
    expect(screen.getByText("Network (Inbound)")).toBeDefined();
    expect(screen.getByText("Network (Outbound)")).toBeDefined();
  });

  it("updates stats when websocket event delivers stats payload and handles yellow/red thresholds", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <ServerDetailsBlock />
        </Wrapper>
      </ServerContext.Provider>,
    );

    await screen.findByText("Address");
    expect(websocketCallback).not.toBeNull();

    act(() => {
      websocketCallback!(
        JSON.stringify({
          memory_bytes: 1024 * 1024 * 1800, // > 80% (yellow)
          cpu_absolute: 190.0, // 190/200 = 95% (red)
          disk_bytes: 1024 * 1024 * 1200,
          network: {
            tx_bytes: 1048576,
            rx_bytes: 2097152,
          },
          uptime: 3600000,
        }),
      );
    });

    expect(screen.getByText("190.00%")).toBeDefined();
    expect(screen.getByText("1.76 GiB")).toBeDefined();
    expect(screen.getByText("1.17 GiB")).toBeDefined();
  });

  it("handles offline status for CPU, Memory, Inbound, Outbound", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper status="offline">
          <ServerDetailsBlock />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("Address")).toBeDefined();
    const offlineLabels = screen.getAllByText("Offline");
    expect(offlineLabels.length).toBeGreaterThanOrEqual(4);
  });

  it("handles null status and starting status without uptime", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper status="starting">
          <ServerDetailsBlock />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("Address")).toBeDefined();
    expect(screen.getByText("Starting")).toBeDefined();
  });

  it("handles unlimited resources (0 limit) and allocation without alias", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper
          limits={{ cpu: 0, memory: 0, disk: 0 }}
          allocations={[
            {
              id: 2,
              ip: "192.168.1.1",
              alias: null,
              port: 8080,
              isDefault: true,
            },
          ]}
        >
          <ServerDetailsBlock />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("Address")).toBeDefined();
    expect(screen.getByText("192.168.1.1:8080")).toBeDefined();
    expect(screen.getAllByText("/ ∞").length).toBeGreaterThanOrEqual(2);
  });

  it("handles missing default allocation ('n/a')", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper
          allocations={[
            {
              id: 3,
              ip: "10.0.0.1",
              alias: null,
              port: 22,
              isDefault: false,
            },
          ]}
        >
          <ServerDetailsBlock />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("Address")).toBeDefined();
    expect(screen.getByText("n/a")).toBeDefined();
  });

  it("sends SEND_STATS when socket connects and ignores invalid socket JSON", async () => {
    const mockSend = vi.fn();
    render(
      <ServerContext.Provider>
        <Wrapper connected mockSocketSend={mockSend}>
          <ServerDetailsBlock />
        </Wrapper>
      </ServerContext.Provider>,
    );

    await screen.findByText("Address");
    expect(mockSend).toHaveBeenCalledWith(SocketRequest.SEND_STATS);

    expect(() => {
      act(() => {
        websocketCallback!("invalid-json{");
      });
    }).not.toThrow();
  });
});
