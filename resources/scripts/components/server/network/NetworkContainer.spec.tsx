import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import NetworkContainer from "./NetworkContainer";
import { ServerContext } from "@/state/server";
import getServerAllocations from "@/api/server/network/getServerAllocations";
import createServerAllocation from "@/api/server/network/createServerAllocation";
import { Allocation } from "@/api/server/getServer";

vi.mock("@/api/server/network/getServerAllocations");
vi.mock("@/api/server/network/createServerAllocation");

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: () => null,
}));

vi.mock("@blueprint/components/Server/Network/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Network/AfterContent", () => ({
  default: () => null,
}));

vi.mock("@/components/server/network/AllocationRow", () => ({
  default: ({ allocation }: { allocation: Allocation }) => (
    <div data-testid="allocation-row">
      <span>
        {allocation.ip}:{allocation.port}
      </span>
    </div>
  ),
}));

const mockAllocations: Allocation[] = [
  {
    id: 1,
    ip: "127.0.0.1",
    alias: null,
    port: 25565,
    notes: "",
    isDefault: true,
  },
];

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState(
    (s) => !!s.server.data && s.server.permissions.length > 0,
  );
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
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
        memory: 1024,
        swap: 0,
        disk: 1024,
        io: 500,
        cpu: 100,
        threads: "",
      },
      featureLimits: { databases: 1, allocations: 5, backups: 2 },
      isTransferring: false,
      eggFeatures: [],
      allocations: mockAllocations,
      variables: [],
    } as any);
    setPermissions(["*"]);
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

import { store } from "@/state";

describe("components/server/network/NetworkContainer", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    store.getActions().settings.setSettings({
      name: "Pterodactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "" },
      blueprint: { disable_attribution: true },
    } as any);
    vi.mocked(getServerAllocations).mockReturnValue({
      data: mockAllocations,
      error: null,
      mutate: mockMutate,
    } as any);
  });

  it("renders allocation rows and Create Allocation button", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <NetworkContainer />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("127.0.0.1:25565")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Create Allocation" }),
    ).toBeDefined();
  });

  it("creates new allocation when clicking Create Allocation button", async () => {
    const newAllocation: Allocation = {
      id: 2,
      ip: "127.0.0.1",
      alias: null,
      port: 25566,
      notes: "",
      isDefault: false,
    };
    vi.mocked(createServerAllocation).mockResolvedValueOnce(newAllocation);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <NetworkContainer />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const createBtn = await screen.findByRole("button", {
      name: "Create Allocation",
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(createServerAllocation).toHaveBeenCalledWith("server-uuid-1");
    });
  });

  it("handles createServerAllocation rejection", async () => {
    vi.mocked(createServerAllocation).mockRejectedValueOnce(
      new Error("Creation failed"),
    );

    render(
      <ServerContext.Provider>
        <Wrapper>
          <NetworkContainer />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const createBtn = await screen.findByRole("button", {
      name: "Create Allocation",
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(createServerAllocation).toHaveBeenCalledWith("server-uuid-1");
    });
  });

  it("renders spinner when data is not loaded yet", () => {
    vi.mocked(getServerAllocations).mockReturnValueOnce({
      data: null,
      error: null,
      mutate: mockMutate,
    } as any);

    const { container } = render(
      <ServerContext.Provider>
        <Wrapper>
          <NetworkContainer />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(container.querySelector(".spinner")).toBeDefined();
  });

  it("handles error from getServerAllocations", () => {
    vi.mocked(getServerAllocations).mockReturnValueOnce({
      data: mockAllocations,
      error: new Error("Failed to load allocations"),
      mutate: mockMutate,
    } as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <NetworkContainer />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(screen.getByText("127.0.0.1:25565")).toBeDefined();
  });

  it("does not render create button when allocation limit reached", () => {
    const CustomWrapper = ({ children }: { children: React.ReactNode }) => {
      const isReady = ServerContext.useStoreState(
        (s) => !!s.server.data && s.server.permissions.length > 0,
      );
      const setServer = ServerContext.useStoreActions(
        (a) => a.server.setServer,
      );
      const setPermissions = ServerContext.useStoreActions(
        (a) => a.server.setPermissions,
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
            memory: 1024,
            swap: 0,
            disk: 1024,
            io: 500,
            cpu: 100,
            threads: "",
          },
          featureLimits: { databases: 1, allocations: 1, backups: 2 },
          isTransferring: false,
          eggFeatures: [],
          allocations: mockAllocations,
          variables: [],
        } as any);
        setPermissions(["*"]);
      }, []);

      if (!isReady) return null;
      return <>{children}</>;
    };

    render(
      <ServerContext.Provider>
        <CustomWrapper>
          <NetworkContainer />
        </CustomWrapper>
      </ServerContext.Provider>,
    );

    expect(
      screen.queryByRole("button", { name: "Create Allocation" }),
    ).toBeNull();
  });

  it("does not render allocation section when allocationLimit is 0", () => {
    const ZeroLimitWrapper = ({ children }: { children: React.ReactNode }) => {
      const isReady = ServerContext.useStoreState(
        (s) => !!s.server.data && s.server.permissions.length > 0,
      );
      const setServer = ServerContext.useStoreActions(
        (a) => a.server.setServer,
      );
      const setPermissions = ServerContext.useStoreActions(
        (a) => a.server.setPermissions,
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
            memory: 1024,
            swap: 0,
            disk: 1024,
            io: 500,
            cpu: 100,
            threads: "",
          },
          featureLimits: { databases: 1, allocations: 0, backups: 2 },
          isTransferring: false,
          eggFeatures: [],
          allocations: mockAllocations,
          variables: [],
        } as any);
        setPermissions(["*"]);
      }, []);

      if (!isReady) return null;
      return <>{children}</>;
    };

    render(
      <ServerContext.Provider>
        <ZeroLimitWrapper>
          <NetworkContainer />
        </ZeroLimitWrapper>
      </ServerContext.Provider>,
    );

    expect(
      screen.queryByText(/allowed allocations for this server/),
    ).toBeNull();
  });
});
