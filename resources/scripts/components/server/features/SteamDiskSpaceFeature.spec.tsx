import React from "react";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import EventEmitter from "events";
import SteamDiskSpaceFeature from "./SteamDiskSpaceFeature";
import { ServerContext } from "@/state/server";
import { store } from "@/state";
import { SocketEvent } from "@/components/server/events";

describe("SteamDiskSpaceFeature component", () => {
  let mockSocket: EventEmitter & { close: () => void };

  beforeEach(() => {
    mockSocket = Object.assign(new EventEmitter(), {
      close: vi.fn(),
    });
    store.getActions().user.setUserData({
      uuid: "123",
      username: "admin",
      email: "admin@example.com",
      avatarUrl: null,
      language: "en",
      rootAdmin: true,
      useTotp: false,
      blurSensitiveData: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(cleanup);

  const renderFeature = async (isAdmin = true, isRunning = false) => {
    store.getActions().user.setUserData({
      ...store.getState().user.data!,
      rootAdmin: isAdmin,
    });

    let setSocketInstance: (instance: any) => void = () => {};
    let setConnected: (val: boolean) => void = () => {};
    let setStatus: (val: any) => void = () => {};

    const Helper = () => {
      const setInst = ServerContext.useStoreActions(
        (actions) => actions.socket.setInstance,
      );
      const setConn = ServerContext.useStoreActions(
        (actions) => actions.socket.setConnectionState,
      );
      const setSt = ServerContext.useStoreActions(
        (actions) => actions.status.setServerStatus,
      );
      React.useEffect(() => {
        setSocketInstance = setInst;
        setConnected = setConn;
        setStatus = setSt;
      }, [setInst, setConn, setSt]);
      return null;
    };

    const utils = render(
      <ServerContext.Provider>
        <Helper />
        <SteamDiskSpaceFeature />
      </ServerContext.Provider>,
    );

    await act(async () => {
      setSocketInstance(mockSocket);
      setConnected(true);
      if (isRunning) {
        setStatus("running");
      }
    });

    return utils;
  };

  it("detects steamcmd disk space error and displays modal for admin", async () => {
    const { getByText, queryByText } = await renderFeature(true);

    expect(queryByText("Out of available disk space...")).toBeNull();

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Error: steamcmd needs 250mb of free disk space to update",
      );
    });

    expect(getByText("Out of available disk space...")).toBeDefined();
    expect(getByText(/Ensure the machine has enough disk space/)).toBeDefined();

    // Close button dismisses modal
    await act(async () => {
      fireEvent.click(getByText("Close"));
    });

    expect(queryByText("Out of available disk space...")).toBeNull();
  });

  it("displays non-admin instructions when user is not a root admin", async () => {
    const { getByText } = await renderFeature(false);

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Update job failed with error: 0x202 after update job",
      );
    });

    expect(getByText("Out of available disk space...")).toBeDefined();
    expect(
      getByText(/Please get in touch with the administrator\(s\)/),
    ).toBeDefined();

    // Close button click for non-admin
    await act(async () => {
      fireEvent.click(getByText("Close"));
    });

    // Test onDismissed via close-icon
    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Update job failed with error: 0x202 after update job",
      );
    });
    const closeIcon = document.querySelector(".close-icon");
    if (closeIcon) {
      await act(async () => {
        fireEvent.click(closeIcon);
      });
    }
  });

  it("ignores errors when server is already running", async () => {
    const { queryByText } = await renderFeature(true, true);

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "steamcmd needs 250mb of free disk space to update",
      );
    });

    expect(queryByText("Out of available disk space...")).toBeNull();
  });

  it("ignores non-matching console output", async () => {
    const { queryByText } = await renderFeature(true, false);

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Normal Steam log line without disk error",
      );
    });

    expect(queryByText("Out of available disk space...")).toBeNull();
  });
});
