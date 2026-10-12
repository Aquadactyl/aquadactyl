import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ServerQuickActions from "./ServerQuickActions";
import sendServerPowerAction from "@/api/server/sendServerPowerAction";
import { MemoryRouter } from "react-router";
import { Server } from "@/api/server/getServer";

vi.mock("@/api/server/sendServerPowerAction", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const mockServer: Server = {
  id: "srv-1" as any,
  identifier: "serv_1" as any,
  internalId: 1,
  uuid: "uuid-1",
  name: "BungeeCord",
  node: "Node1",
  isNodeUnderMaintenance: false,
  status: null,
  skipScripts: false,
  invocation: "java",
  dockerImage: "java:latest",
  sftpDetails: { ip: "127.0.0.1", port: 2022 },
  description: "Test",
  limits: { memory: 1024, swap: 0, disk: 1024, io: 500, cpu: 100, threads: "" },
  featureLimits: { databases: 1, allocations: 1, backups: 1 },
  isTransferring: false,
  eggFeatures: [],
  allocations: [],
  variables: [],
  userPermissions: [
    "websocket.connect",
    "file.read",
    "control.start",
    "control.restart",
    "control.stop",
  ],
  BlueprintFramework: { eggId: 1 },
};

describe("components/dashboard/ServerQuickActions", () => {
  const onPower = vi.fn();
  const onRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (server = mockServer, state = "offline") =>
    render(
      <MemoryRouter>
        <ServerQuickActions
          server={server}
          state={state}
          onPower={onPower}
          onRefresh={onRefresh}
        />
      </MemoryRouter>,
    );

  it("renders console and file links with correct hrefs", () => {
    renderComponent();

    expect(
      screen.getByRole("link", { name: /Console/i }).getAttribute("href"),
    ).toBe("/server/srv-1");
    expect(
      screen.getByRole("link", { name: /Files/i }).getAttribute("href"),
    ).toBe("/server/srv-1/files");
  });

  it("handles power actions (start when offline)", async () => {
    renderComponent(mockServer, "offline");

    const startBtn = screen.getByRole("button", {
      name: "Start BungeeCord",
    }) as HTMLButtonElement;
    expect(startBtn.disabled).toBe(false);

    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(sendServerPowerAction).toHaveBeenCalledWith("uuid-1", "start");
      expect(onPower).toHaveBeenCalledWith("start");
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("handles restart and stop when running", async () => {
    renderComponent(mockServer, "running");

    const restartBtn = screen.getByRole("button", {
      name: "Restart BungeeCord",
    }) as HTMLButtonElement;
    const stopBtn = screen.getByRole("button", {
      name: "Stop BungeeCord",
    }) as HTMLButtonElement;

    expect(restartBtn.disabled).toBe(false);
    expect(stopBtn.disabled).toBe(false);

    fireEvent.click(restartBtn);

    await waitFor(() => {
      expect(sendServerPowerAction).toHaveBeenCalledWith("uuid-1", "restart");
      expect(onPower).toHaveBeenCalledWith("restart");
    });
  });

  it("displays error message if power action fails", async () => {
    vi.mocked(sendServerPowerAction).mockRejectedValueOnce(
      new Error("Daemon is offline"),
    );

    renderComponent(mockServer, "offline");

    const startBtn = screen.getByRole("button", { name: "Start BungeeCord" });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText(/Daemon is offline/i)).toBeDefined();
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("returns null if user has no permissions", () => {
    const restrictedServer = { ...mockServer, userPermissions: [] };
    const { container } = renderComponent(restrictedServer);

    expect(container.firstChild).toBeNull();
  });
});
