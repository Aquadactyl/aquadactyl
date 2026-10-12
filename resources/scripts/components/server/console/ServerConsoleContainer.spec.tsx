import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ServerConsoleContainer from "./ServerConsoleContainer";

let mockServerState: any = {};

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) => selector(mockServerState),
  },
}));

vi.mock("@/components/elements/ServerContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/server/console/PowerButtons", () => ({
  default: () => <div data-testid="power-buttons">PowerButtons</div>,
}));

vi.mock("@/components/server/console/Console", () => ({
  default: () => <div data-testid="console">Console</div>,
}));

vi.mock("@/components/server/console/ServerDetailsBlock", () => ({
  default: () => (
    <div data-testid="server-details-block">ServerDetailsBlock</div>
  ),
}));

vi.mock("@/components/server/console/StatGraphs", () => ({
  default: () => <div data-testid="stat-graphs">StatGraphs</div>,
}));

vi.mock("@feature/Features", () => ({
  default: () => <div data-testid="features">Features</div>,
}));

vi.mock("@blueprint/components/Server/Terminal/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Terminal/AfterContent", () => ({
  default: () => null,
}));

describe("components/server/console/ServerConsoleContainer", () => {
  beforeEach(() => {
    mockServerState = {
      server: {
        data: {
          name: "Survival World",
          uuid: "1234-5678-uuid",
          description: "A survival world description",
          isTransferring: false,
          isNodeUnderMaintenance: false,
          eggFeatures: ["eula"],
        },
        isInstalling: false,
      },
    };
  });

  it("renders server console details in normal state", () => {
    render(<ServerConsoleContainer />);

    expect(screen.getByText("Survival World")).toBeTruthy();
    expect(screen.getByText("1234-5678-uuid")).toBeTruthy();
    expect(screen.getByText("A survival world description")).toBeTruthy();
    expect(screen.getByTestId("console")).toBeTruthy();
    expect(screen.getByTestId("server-details-block")).toBeTruthy();
    expect(screen.getByTestId("power-buttons")).toBeTruthy();
    expect(screen.getByTestId("stat-graphs")).toBeTruthy();
    expect(screen.getByTestId("features")).toBeTruthy();
    expect(screen.queryByText(/under maintenance/i)).toBeNull();
  });

  it("renders maintenance alert when node is under maintenance", () => {
    mockServerState.server.data.isNodeUnderMaintenance = true;
    render(<ServerConsoleContainer />);

    expect(
      screen.getByText(
        /The node of this server is currently under maintenance/i,
      ),
    ).toBeTruthy();
  });

  it("renders installation alert when server is installing", () => {
    mockServerState.server.isInstalling = true;
    render(<ServerConsoleContainer />);

    expect(
      screen.getByText(
        /This server is currently running its installation process/i,
      ),
    ).toBeTruthy();
  });

  it("renders transferring alert when server is transferring", () => {
    mockServerState.server.data.isTransferring = true;
    render(<ServerConsoleContainer />);

    expect(
      screen.getByText(
        /This server is currently being transferred to another node/i,
      ),
    ).toBeTruthy();
  });
});
