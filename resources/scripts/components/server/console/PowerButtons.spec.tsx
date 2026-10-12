import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import PowerButtons from "@/components/server/console/PowerButtons";
import { ServerContext, ServerStatus } from "@/state/server";

vi.mock("@blueprint/components/Server/Terminal/AdditionalPowerButtons", () => ({
  default: () => null,
}));

const createMockSocket = (overrides?: any) => ({
  send: vi.fn(),
  removeAllListeners: vi.fn(),
  close: vi.fn(),
  ...overrides,
});

const Inner = ({
  status,
  permissions,
  socketMock,
  children,
}: {
  status: ServerStatus;
  permissions: string[];
  socketMock?: any;
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );
  const setServerStatus = ServerContext.useStoreActions(
    (a) => a.status.setServerStatus,
  );
  const setSocketInstance = ServerContext.useStoreActions(
    (a) => a.socket.setInstance,
  );

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-1",
    } as any);
    setPermissions(permissions);
    setServerStatus(status);
    if (socketMock) {
      setSocketInstance(socketMock);
    }
  }, [
    setServer,
    setPermissions,
    setServerStatus,
    setSocketInstance,
    permissions,
    status,
    socketMock,
  ]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  status = "offline",
  permissions = ["control.start", "control.restart", "control.stop"],
  socketMock,
  children,
}: {
  status?: ServerStatus;
  permissions?: string[];
  socketMock?: any;
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner status={status} permissions={permissions} socketMock={socketMock}>
        {children}
      </Inner>
    </ServerContext.Provider>
  );
};

describe("PowerButtons", () => {
  it("enables Start button and disables Stop button when server is offline", () => {
    render(
      <Wrapper status={"offline"}>
        <PowerButtons />
      </Wrapper>,
    );

    const startBtn = screen.getByRole("button", { name: "Start" });
    const stopBtn = screen.getByRole("button", { name: "Stop" });

    expect(startBtn.hasAttribute("disabled")).toBe(false);
    expect(stopBtn.hasAttribute("disabled")).toBe(true);
  });

  it("sends start command through socket when Start button is clicked", () => {
    const socket = createMockSocket();
    render(
      <Wrapper status={"offline"} socketMock={socket}>
        <PowerButtons />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(socket.send).toHaveBeenCalledWith("set state", "start");
  });

  it("sends restart command when Restart button is clicked on a running server", () => {
    const socket = createMockSocket();
    render(
      <Wrapper status={"running"} socketMock={socket}>
        <PowerButtons />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Restart" }));
    expect(socket.send).toHaveBeenCalledWith("set state", "restart");
  });

  it("displays Kill button and opens confirmation dialog when server is stopping", () => {
    const socket = createMockSocket();
    render(
      <Wrapper status={"stopping"} socketMock={socket}>
        <PowerButtons />
      </Wrapper>,
    );

    const killBtn = screen.getByRole("button", { name: "Kill" });
    expect(killBtn).toBeDefined();

    fireEvent.click(killBtn);

    // Confirmation dialog should be displayed
    const confirmBtn = screen.getByRole("button", { name: "Continue" });
    expect(confirmBtn).toBeDefined();

    fireEvent.click(confirmBtn);
    expect(socket.send).toHaveBeenCalledWith("set state", "kill");
  });

  it("closes confirmation dialog when Cancel button is clicked", async () => {
    render(
      <Wrapper status={"stopping"}>
        <PowerButtons />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kill" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    });
  });

  it("sends stop command when server is running and Stop is clicked", () => {
    const socket = createMockSocket();
    render(
      <Wrapper status={"running"} socketMock={socket}>
        <PowerButtons className={"custom-power"} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(socket.send).toHaveBeenCalledWith("set state", "stop");
  });

  it("does not send command when socket instance is not present", () => {
    render(
      <Wrapper status={"offline"} socketMock={null}>
        <PowerButtons />
      </Wrapper>,
    );

    const startBtn = screen.getByRole("button", { name: "Start" });
    fireEvent.click(startBtn);
    expect(startBtn).toBeDefined();
  });

  it("disables Restart button when status is null or undefined", () => {
    render(
      <Wrapper status={null as any}>
        <PowerButtons />
      </Wrapper>,
    );

    const restartBtn = screen.getByRole("button", { name: "Restart" });
    expect(restartBtn.hasAttribute("disabled")).toBe(true);
  });
});
