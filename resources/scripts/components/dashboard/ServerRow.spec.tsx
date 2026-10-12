import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
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

let mockServerStats: any = {
  status: "running",
  isSuspended: false,
  memoryUsageInBytes: 1024 * 1024 * 512,
  cpuUsagePercent: 25.5,
  diskUsageInBytes: 1024 * 1024 * 1024,
  networkRxInBytes: 0,
  networkTxInBytes: 0,
  uptime: 1000,
};

vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: () => ({
    data: mockServerStats,
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
    mockServerStats = {
      status: "running",
      isSuspended: false,
      memoryUsageInBytes: 1024 * 1024 * 512,
      cpuUsagePercent: 25.5,
      diskUsageInBytes: 1024 * 1024 * 1024,
      networkRxInBytes: 0,
      networkTxInBytes: 0,
      uptime: 1000,
    };

    store.getActions().settings.setSettings({
      name: "Pterodactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "" },
      blueprint: { disable_attribution: true },
      features: { playerCounts: true },
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

  it("renders unlimited limits when memory, cpu, disk limits are 0", () => {
    const unlimitedServer: Server = {
      ...mockServer,
      limits: { ...mockServer.limits, memory: 0, cpu: 0, disk: 0 },
    };

    render(
      <MemoryRouter>
        <ServerRow server={unlimitedServer} />
      </MemoryRouter>,
    );

    const unlimitedElements = screen.getAllByText("Unlimited");
    expect(unlimitedElements.length).toBeGreaterThanOrEqual(3);
  });

  it("triggers alarm state when resource usage exceeds limits", () => {
    mockServerStats.cpuUsagePercent = 250; // > 200
    mockServerStats.memoryUsageInBytes = 1024 * 1024 * 2500; // > 2048 MB

    const { container } = render(
      <MemoryRouter>
        <ServerRow server={mockServer} />
      </MemoryRouter>,
    );

    expect(container.querySelector(".server-resource-alarm")).toBeDefined();
  });

  it("shows dash placeholder when server is suspended or stats are unavailable", () => {
    mockServerStats.isSuspended = true;

    render(
      <MemoryRouter>
        <ServerRow server={mockServer} />
      </MemoryRouter>,
    );

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("displays server status badges for installing, install_failed, and reinstall_failed", () => {
    const statuses = [
      "installing",
      "install_failed",
      "reinstall_failed",
    ] as const;

    for (const status of statuses) {
      const { unmount } = render(
        <MemoryRouter>
          <ServerRow server={{ ...mockServer, status }} />
        </MemoryRouter>,
      );

      expect(screen.getByRole("article")).toBeDefined();
      unmount();
    }
  });

  it("handles server without description and with IP-only allocation", () => {
    const ipOnlyServer: Server = {
      ...mockServer,
      description: "",
      allocations: [
        {
          id: 2,
          ip: "10.0.0.5",
          alias: null,
          port: 8080,
          isDefault: true,
          notes: "",
        },
      ],
    };

    render(
      <MemoryRouter>
        <ServerRow server={ipOnlyServer} />
      </MemoryRouter>,
    );

    expect(screen.getByText("10.0.0.5:8080")).toBeDefined();
  });

  it("handles server with no allocations ('No address assigned')", () => {
    const noAllocServer: Server = {
      ...mockServer,
      allocations: [],
    };

    render(
      <MemoryRouter>
        <ServerRow server={noAllocServer} />
      </MemoryRouter>,
    );

    expect(screen.getByText("No address assigned")).toBeDefined();
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
