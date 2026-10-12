import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import ServerRow from "./ServerRow";
import { Server } from "@/api/server/getServer";
import { store } from "@/state";

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({
    t: (_key: string, fallback?: string, params?: Record<string, unknown>) => {
      if (params) {
        let str = fallback || _key;
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(`{{${k}}}`, String(v));
        });
        return str;
      }
      return fallback || _key;
    },
  }),
}));

vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: () => ({
    data: {
      status: "running",
      isSuspended: false,
      memoryUsageInBytes: 1024 * 1024 * 512,
      cpuUsagePercent: 25.5,
      diskUsageInBytes: 1024 * 1024 * 1024,
      networkRxInBytes: 0,
      networkTxInBytes: 0,
      uptime: 1000,
    },
    error: null,
    mutate: vi.fn(),
  }),
}));

vi.mock(
  "@blueprint/components/Dashboard/Serverlist/ServerRow/BeforeEntryName",
  () => ({
    default: () => null,
  }),
);
vi.mock(
  "@blueprint/components/Dashboard/Serverlist/ServerRow/AfterEntryName",
  () => ({
    default: () => null,
  }),
);
vi.mock(
  "@blueprint/components/Dashboard/Serverlist/ServerRow/BeforeEntryDescription",
  () => ({
    default: () => null,
  }),
);
vi.mock(
  "@blueprint/components/Dashboard/Serverlist/ServerRow/AfterEntryDescription",
  () => ({
    default: () => null,
  }),
);
vi.mock(
  "@blueprint/components/Dashboard/Serverlist/ServerRow/ResourceLimits",
  () => ({
    default: () => null,
  }),
);
vi.mock("./ServerPlayerCount", () => ({
  default: () => null,
}));
vi.mock("./ServerQuickActions", () => ({
  default: () => null,
}));

const mockServer: Server = {
  id: "serv_srv-1" as any,
  identifier: "serv_srv-1" as any,
  internalId: 1,
  skipScripts: false,
  BlueprintFramework: { eggId: 1 },
  uuid: "uuid-srv-1",
  name: "My Minecraft Server",
  node: "Node Alpha",
  isNodeUnderMaintenance: false,
  status: null,
  invocation: "java -jar server.jar",
  dockerImage: "java:latest",
  sftpDetails: { ip: "127.0.0.1", port: 2022 },
  description: "A great game server",
  limits: {
    memory: 2048,
    swap: 0,
    disk: 5120,
    io: 500,
    cpu: 200,
    threads: "",
  },
  featureLimits: { databases: 2, allocations: 2, backups: 2 },
  isTransferring: false,
  eggFeatures: [],
  allocations: [
    {
      id: 1,
      ip: "192.168.1.100",
      alias: "mc.example.com",
      port: 25565,
      notes: "",
      isDefault: true,
    },
  ],
  variables: [],
};

describe("components/dashboard/ServerRow", () => {
  beforeEach(() => {
    store.getActions().settings.setSettings({
      name: "Pterodactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "" },
      blueprint: { disable_attribution: true },
    } as any);
  });

  it("renders server name, address, and connects link to /server/:id", () => {
    render(
      <MemoryRouter>
        <ServerRow server={mockServer} />
      </MemoryRouter>,
    );

    expect(screen.getByText("My Minecraft Server")).toBeDefined();
    expect(screen.getByText("mc.example.com:25565")).toBeDefined();
    expect(
      screen
        .getAllByRole("link", { name: "Open My Minecraft Server" })[0]
        .getAttribute("href"),
    ).toBe("/server/serv_srv-1");
  });

  it("displays server status badge for suspended server", () => {
    const suspendedServer: Server = {
      ...mockServer,
      status: "suspended",
    };

    render(
      <MemoryRouter>
        <ServerRow server={suspendedServer} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Suspended")).toBeDefined();
  });

  it("displays maintenance badge when node is under maintenance", () => {
    const maintServer = { ...mockServer, isNodeUnderMaintenance: true };

    render(
      <MemoryRouter>
        <ServerRow server={maintServer} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Maintenance")).toBeDefined();
  });

  it("displays transferring badge when server is transferring", () => {
    const transferServer = { ...mockServer, isTransferring: true };

    render(
      <MemoryRouter>
        <ServerRow server={transferServer} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Transferring")).toBeDefined();
  });
});
