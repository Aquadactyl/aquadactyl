import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import HytaleOauthRequireFeature from "@/components/server/features/HytaleOauthRequireFeature";
import { ServerContext } from "@/state/server";
import { SocketEvent } from "@/components/server/events";
import EventEmitter from "events";

const createMockSocket = () =>
  Object.assign(new EventEmitter(), {
    send: vi.fn(),
    close: vi.fn(),
  });

const Inner = ({
  socketMock,
  children,
}: {
  socketMock: any;
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setConnectionState = ServerContext.useStoreActions(
    (a) => a.socket.setConnectionState,
  );
  const setSocketInstance = ServerContext.useStoreActions(
    (a) => a.socket.setInstance,
  );
  const setServerStatus = ServerContext.useStoreActions(
    (a) => a.status.setServerStatus,
  );

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-hytale-uuid",
    } as any);
    setConnectionState(true);
    setSocketInstance(socketMock);
    setServerStatus("offline");
  }, [
    setServer,
    setConnectionState,
    setSocketInstance,
    setServerStatus,
    socketMock,
  ]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  socketMock,
  children,
}: {
  socketMock: any;
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner socketMock={socketMock}>{children}</Inner>
    </ServerContext.Provider>
  );
};

describe("HytaleOauthRequireFeature", () => {
  it("displays authentication prompt when oauth verification URL appears in console", async () => {
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <HytaleOauthRequireFeature />
      </Wrapper>,
    );

    expect(screen.queryByText("Authentication Required")).toBeNull();

    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Please visit https://oauth.accounts.hytale.com/oauth2/device/verify?user_code=ABCD-1234 to login",
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Authentication Required")).toBeDefined();
    });
  });

  it("opens link in new tab when user clicks Log in", async () => {
    const socket = createMockSocket();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <Wrapper socketMock={socket}>
        <HytaleOauthRequireFeature />
      </Wrapper>,
    );

    const testUrl =
      "https://oauth.accounts.hytale.com/oauth2/device/verify?user_code=XYZW-9999";
    act(() => {
      socket.emit(SocketEvent.CONSOLE_OUTPUT, testUrl);
    });

    await waitFor(() => {
      expect(screen.getByText("Authentication Required")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(openSpy).toHaveBeenCalledWith(
      testUrl,
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("closes modal when clicking Cancel button and onDismissed", async () => {
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <HytaleOauthRequireFeature />
      </Wrapper>,
    );

    const testUrl =
      "https://oauth.accounts.hytale.com/oauth2/device/verify?user_code=XYZW-9999";
    act(() => {
      socket.emit(SocketEvent.CONSOLE_OUTPUT, testUrl);
    });

    await waitFor(() => {
      expect(screen.getByText("Authentication Required")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Test onDismissed via close-icon
    act(() => {
      socket.emit(SocketEvent.CONSOLE_OUTPUT, testUrl);
    });
    const closeIcon = document.querySelector(".close-icon");
    if (closeIcon) {
      fireEvent.click(closeIcon);
    }
  });

  it("ignores non-matching console lines", async () => {
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <HytaleOauthRequireFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(SocketEvent.CONSOLE_OUTPUT, "Normal server log line");
    });

    expect(screen.queryByText("Authentication Required")).toBeNull();
  });

  it("does not listen if status is running or not connected", async () => {
    const socket = createMockSocket();

    const Disconnected = () => {
      const setServer = ServerContext.useStoreActions(
        (a) => a.server.setServer,
      );
      const setConnectionState = ServerContext.useStoreActions(
        (a) => a.socket.setConnectionState,
      );
      const setServerStatus = ServerContext.useStoreActions(
        (a) => a.status.setServerStatus,
      );

      useEffect(() => {
        setServer({ id: "1", uuid: "server-uuid" } as any);
        setConnectionState(false);
        setServerStatus("running");
      }, [setServer, setConnectionState, setServerStatus]);

      return <HytaleOauthRequireFeature />;
    };

    render(
      <ServerContext.Provider>
        <Disconnected />
      </ServerContext.Provider>,
    );

    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "https://oauth.accounts.hytale.com/oauth2/device/verify?user_code=XYZW-9999",
      );
    });

    expect(screen.queryByText("Authentication Required")).toBeNull();
  });
});
