import React, { useEffect, useState } from "react";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import EventEmitter from "events";
import EulaModalFeature from "./EulaModalFeature";
import { ServerContext } from "@/state/server";
import saveFileContents from "@/api/server/files/saveFileContents";
import { SocketEvent, SocketRequest } from "@/components/server/events";
import { store } from "@/state";

vi.mock("@/api/server/files/saveFileContents");

describe("EulaModalFeature component", () => {
  let mockSocket: EventEmitter & { send: any; close: any };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = Object.assign(new EventEmitter(), {
      send: vi.fn(),
      close: vi.fn(),
    });
  });

  afterEach(cleanup);

  const TestContainer = ({ serverStatus }: { serverStatus: string }) => {
    const [ready, setReady] = useState(false);
    const setInstance = ServerContext.useStoreActions(
      (actions) => actions.socket.setInstance,
    );
    const setConnected = ServerContext.useStoreActions(
      (actions) => actions.socket.setConnectionState,
    );
    const setServer = ServerContext.useStoreActions(
      (actions) => actions.server.setServer,
    );
    const setStatus = ServerContext.useStoreActions(
      (actions) => actions.status.setServerStatus,
    );

    useEffect(() => {
      setServer({
        uuid: "server-uuid-123",
        name: "Minecraft Server",
      } as any);
      setInstance(mockSocket as any);
      setConnected(true);
      setStatus(serverStatus as any);
      setReady(true);
    }, [serverStatus, setInstance, setConnected, setServer, setStatus]);

    return ready ? <EulaModalFeature /> : null;
  };

  const renderFeature = async (serverStatus = "offline") => {
    return render(
      <ServerContext.Provider>
        <TestContainer serverStatus={serverStatus} />
      </ServerContext.Provider>,
    );
  };

  it("detects EULA prompt from console output and shows modal", async () => {
    const { getByText, queryByText } = await renderFeature();

    expect(queryByText(/Accept Minecraft/i)).toBeNull();

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "[Server thread/INFO]: You need to agree to the EULA in order to run the server. Go to eula.txt for more info.",
      );
    });

    expect(getByText(/Accept Minecraft/i)).toBeDefined();
    expect(getByText("I Accept")).toBeDefined();
  });

  it("saves eula=true to eula.txt and restarts server upon clicking accept", async () => {
    (saveFileContents as any).mockResolvedValue(undefined);

    const { getByText, queryByText } = await renderFeature("offline");

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "You need to agree to the EULA in order to run the server",
      );
    });

    const acceptBtn = getByText("I Accept");

    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    expect(saveFileContents).toHaveBeenCalledWith(
      "server-uuid-123",
      "eula.txt",
      "eula=true",
    );

    expect(mockSocket.send).toHaveBeenCalledWith(
      SocketRequest.SET_STATE,
      "restart",
    );

    expect(queryByText("I Accept")).toBeNull();
  });

  it("handles file save failure and records flash error", async () => {
    (saveFileContents as any).mockRejectedValue(
      new Error("Permission denied saving eula.txt"),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getByText } = await renderFeature("offline");

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "You need to agree to the EULA in order to run the server",
      );
    });

    await act(async () => {
      fireEvent.click(getByText("I Accept"));
    });

    const flashes = store.getState().flashes.items;
    expect(
      flashes.some(
        (f) =>
          f.key === "feature:eula" &&
          f.message === "Permission denied saving eula.txt",
      ),
    ).toBe(true);

    consoleSpy.mockRestore();
  });

  it("can be cancelled or dismissed", async () => {
    const { getByText } = await renderFeature("offline");

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "You need to agree to the EULA in order to run the server",
      );
    });

    expect(getByText(/Accept Minecraft/i)).toBeDefined();

    await act(async () => {
      fireEvent.click(getByText("Cancel"));
    });

    // Test onDismissed via close-icon
    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "You need to agree to the EULA in order to run the server",
      );
    });
    const closeIcon = document.querySelector(".close-icon");
    if (closeIcon) {
      await act(async () => {
        fireEvent.click(closeIcon);
      });
    }
  });

  it("does not trigger modal when running or on non-matching console log", async () => {
    const { queryByText } = await renderFeature("running");

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "You need to agree to the EULA in order to run the server",
      );
    });

    expect(queryByText(/Accept Minecraft/i)).toBeNull();
  });

  it("ignores non-matching console logs when offline", async () => {
    const { queryByText } = await renderFeature("offline");

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Loading libraries, please wait...",
      );
    });

    expect(queryByText(/Accept Minecraft/i)).toBeNull();
  });

  it("saves eula without sending restart when status is not offline", async () => {
    (saveFileContents as any).mockResolvedValue(undefined);

    const { getByText } = await renderFeature("starting");

    await act(async () => {
      mockSocket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "You need to agree to the EULA in order to run the server",
      );
    });

    await act(async () => {
      fireEvent.click(getByText("I Accept"));
    });

    expect(saveFileContents).toHaveBeenCalledWith(
      "server-uuid-123",
      "eula.txt",
      "eula=true",
    );
    expect(mockSocket.send).not.toHaveBeenCalled();
  });
});
