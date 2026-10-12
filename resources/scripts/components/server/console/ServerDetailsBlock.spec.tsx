import { act, render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import ServerDetailsBlock from "./ServerDetailsBlock";
import { ServerContext } from "@/state/server";

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

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setServerStatus = ServerContext.useStoreActions(
    (a) => a.status.setServerStatus,
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
      limits: {
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
      allocations: [
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
    setServerStatus("running");
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

  it("updates stats when websocket event delivers stats payload", async () => {
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
          memory_bytes: 1024 * 1024 * 500,
          cpu_absolute: 45.2,
          disk_bytes: 1024 * 1024 * 1200,
          network: {
            tx_bytes: 1048576,
            rx_bytes: 2097152,
          },
          uptime: 3600000,
        }),
      );
    });

    expect(screen.getByText("45.20%")).toBeDefined();
    expect(screen.getByText("500 MiB")).toBeDefined();
    expect(screen.getByText("1.17 GiB")).toBeDefined();
    expect(screen.getByText("2 MiB")).toBeDefined();
    expect(screen.getByText("1 MiB")).toBeDefined();
  });
});
