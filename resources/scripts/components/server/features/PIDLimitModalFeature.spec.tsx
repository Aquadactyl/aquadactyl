import React from "react";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import EventEmitter from "events";
import PIDLimitModalFeature from "./PIDLimitModalFeature";
import { ServerContext } from "@/state/server";
import { store } from "@/state";
import { SocketEvent } from "@/components/server/events";

describe("PIDLimitModalFeature component", () => {
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

  const renderWithServer = async (isAdmin = true, isRunning = false) => {
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
        <PIDLimitModalFeature />
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

  it("shows modal with admin instructions when pthread_create error occurs", async () => {
    const { getByText, queryByText } = await renderWithServer(true);

    expect(queryByText("Memory or process limit reached...")).toBeNull();

    // Emit console error matching PID limit
    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "[ERROR] Exception: pthread_create failed: Resource temporarily unavailable",
      );
    });

    expect(getByText("Memory or process limit reached...")).toBeDefined();
    expect(
      getByText(/This server has reached the maximum process or memory limit/),
    ).toBeDefined();

    // Close button dismisses modal
    await act(async () => {
      fireEvent.click(getByText("Close"));
    });

    expect(queryByText("Memory or process limit reached...")).toBeNull();
  });

  it("shows non-admin user instructions when user is not a root admin", async () => {
    const { getByText } = await renderWithServer(false);

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "FATAL: unable to create native thread for JVM",
      );
    });

    expect(getByText("Possible resource limit reached...")).toBeDefined();
    expect(
      getByText(
        /This server is attempting to use more resources than allocated/,
      ),
    ).toBeDefined();

    // Click Close button in non-admin mode
    await act(async () => {
      fireEvent.click(getByText("Close"));
    });

    // Test onDismissed
    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "FATAL: unable to create native thread for JVM",
      );
    });
    expect(getByText("Possible resource limit reached...")).toBeDefined();
    const closeIcon = document.querySelector(".close-icon");
    if (closeIcon) {
      await act(async () => {
        fireEvent.click(closeIcon);
      });
    }
  });

  it("ignores errors if the server is already in running state", async () => {
    const { queryByText } = await renderWithServer(true, true);

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "pthread_create failed: Resource temporarily unavailable",
      );
    });

    expect(queryByText("Memory or process limit reached...")).toBeNull();
  });

  it("ignores non-matching console output", async () => {
    const { queryByText } = await renderWithServer(true, false);

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Server listening on port 25565",
      );
    });

    expect(queryByText("Memory or process limit reached...")).toBeNull();
  });
});
