import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import StartupContainer from "./StartupContainer";
import { ServerContext } from "@/state/server";
import getServerStartup from "@/api/server/startup/getServerStartup";
import setSelectedDockerImage from "@/api/server/setSelectedDockerImage";

vi.mock("@/api/server/startup/getServerStartup");
vi.mock("@/api/server/setSelectedDockerImage");

vi.mock("@blueprint/components/Server/Startup/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Startup/AfterContent", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/InputSpinner", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/elements/TitledGreyBox", () => ({
  default: ({ title, children }: any) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/components/server/startup/VariableBox", () => ({
  default: ({ variable }: any) => (
    <div data-testid="variable-box">
      <span>Var: {variable.name}</span>
    </div>
  ),
}));

const mockStartupData = {
  invocation: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}",
  variables: [
    {
      name: "Server Jar File",
      description: "The name of the jar file to run.",
      envVariable: "SERVER_JARFILE",
      defaultValue: "server.jar",
      serverValue: "server.jar",
      isEditable: true,
      rules: ["required", "string"],
    },
  ],
  dockerImages: {
    "Java 17": "ghcr.io/pterodactyl/yolks:java_17",
    "Java 21": "ghcr.io/pterodactyl/yolks:java_21",
  },
};

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
      invocation: "java -jar server.jar",
      dockerImage: "ghcr.io/pterodactyl/yolks:java_17",
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
      allocations: [],
      variables: mockStartupData.variables as any,
    } as any);
    setPermissions(["*"]);
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

import { store } from "@/state";

describe("components/server/startup/StartupContainer", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    store.getActions().settings.setSettings({
      name: "Pterodactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "" },
      blueprint: { disable_attribution: true },
    } as any);
    vi.mocked(getServerStartup).mockReturnValue({
      data: mockStartupData,
      error: null,
      isValidating: false,
      mutate: mockMutate,
    } as any);
  });

  it("renders startup command, docker image selector, and variables", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <StartupContainer />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(
      await screen.findByText(
        "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}",
      ),
    ).toBeDefined();
    expect(screen.getByText("Docker Image")).toBeDefined();
    expect(screen.getByText("Var: Server Jar File")).toBeDefined();
  });

  it("changes docker image when select option is changed", async () => {
    vi.mocked(setSelectedDockerImage).mockResolvedValueOnce(undefined as any);

    const { container } = render(
      <ServerContext.Provider>
        <Wrapper>
          <StartupContainer />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const select = await waitFor(() => {
      const el = container.querySelector("select");
      if (!el) throw new Error("Select not found");
      return el;
    });

    fireEvent.change(select, {
      target: { value: "ghcr.io/pterodactyl/yolks:java_21" },
    });

    await waitFor(() => {
      expect(setSelectedDockerImage).toHaveBeenCalledWith(
        "server-uuid-1",
        "ghcr.io/pterodactyl/yolks:java_21",
      );
    });
  });
});
