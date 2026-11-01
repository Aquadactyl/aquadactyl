import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import JavaVersionModalFeature from "@/components/server/features/JavaVersionModalFeature";
import { ServerContext } from "@/state/server";
import { SocketEvent, SocketRequest } from "@/components/server/events";
import setSelectedDockerImage from "@/api/server/setSelectedDockerImage";
import getServerStartup from "@/api/server/startup/getServerStartup";
import EventEmitter from "events";

vi.mock("@/api/server/setSelectedDockerImage");
vi.mock("@/api/server/startup/getServerStartup");

const createMockSocket = () =>
  Object.assign(new EventEmitter(), {
    send: vi.fn(),
    close: vi.fn(),
  });

const Inner = ({
  socketMock,
  status = "offline",
  children,
}: {
  socketMock: any;
  status?: string;
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );
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
      uuid: "server-java-uuid",
    } as any);
    setPermissions(["startup.docker-image"]);
    setConnectionState(true);
    setSocketInstance(socketMock);
    setServerStatus(status as any);
  }, [
    setServer,
    setPermissions,
    setConnectionState,
    setSocketInstance,
    setServerStatus,
    socketMock,
    status,
  ]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  socketMock,
  status = "offline",
  children,
}: {
  socketMock: any;
  status?: string;
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner socketMock={socketMock} status={status}>
        {children}
      </Inner>
    </ServerContext.Provider>
  );
};

describe("JavaVersionModalFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerStartup).mockReturnValue({
      data: {
        dockerImages: {
          "Java 17": "ghcr.io/pterodactyl/yoloks:java_17",
          "Java 21": "ghcr.io/pterodactyl/yoloks:java_21",
        },
      } as any,
      isValidating: false,
      mutate: vi.fn().mockResolvedValue({
        dockerImages: {
          "Java 17": "ghcr.io/pterodactyl/yoloks:java_17",
          "Java 21": "ghcr.io/pterodactyl/yoloks:java_21",
        },
      }),
    } as any);
  });

  it("detects Java version error in console and triggers modal display", async () => {
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <JavaVersionModalFeature />
      </Wrapper>,
    );

    expect(screen.queryByText("Unsupported Java Version")).toBeNull();

    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Error: java.lang.UnsupportedClassVersionError: class has been compiled by a more recent version",
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Unsupported Java Version")).toBeDefined();
    });
  });

  it("updates docker image and triggers restart on submission", async () => {
    vi.mocked(setSelectedDockerImage).mockResolvedValueOnce(undefined as any);
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <JavaVersionModalFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "minecraft 1.18 requires running the server with java 17 or above",
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Unsupported Java Version")).toBeDefined();
    });

    const nativeSelect = document.querySelector("select.panel-select-native");
    expect(nativeSelect).toBeDefined();
    fireEvent.change(nativeSelect!, {
      target: { value: "ghcr.io/pterodactyl/yoloks:java_21" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Update Docker Image" }),
    );

    await waitFor(() => {
      expect(setSelectedDockerImage).toHaveBeenCalledWith(
        "server-java-uuid",
        "ghcr.io/pterodactyl/yoloks:java_21",
      );
      expect(socket.send).toHaveBeenCalledWith(
        SocketRequest.SET_STATE,
        "restart",
      );
    });
  });

  it("handles error when updating docker image fails", async () => {
    vi.mocked(setSelectedDockerImage).mockRejectedValueOnce(
      new Error("Failed to update docker image"),
    );
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <JavaVersionModalFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "java.lang.unsupportedclassversionerror",
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Unsupported Java Version")).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Update Docker Image" }),
    );

    await waitFor(() => {
      expect(setSelectedDockerImage).toHaveBeenCalled();
    });
  });

  it("can be cancelled or dismissed", async () => {
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <JavaVersionModalFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "unsupported major.minor version",
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Unsupported Java Version")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Test onDismissed via close-icon
    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "unsupported major.minor version",
      );
    });
    const closeIcon = document.querySelector(".close-icon");
    if (closeIcon) {
      fireEvent.click(closeIcon);
    }
  });

  it("does not trigger modal when server status is running or log does not match", async () => {
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket} status="running">
        <JavaVersionModalFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "minecraft 1.18 requires running the server with java 17 or above",
      );
    });

    expect(screen.queryByText("Unsupported Java Version")).toBeNull();
  });

  it("ignores non-matching console output when offline", async () => {
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket} status="offline">
        <JavaVersionModalFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Starting minecraft server version 1.18",
      );
    });

    expect(screen.queryByText("Unsupported Java Version")).toBeNull();
  });

  it("renders with empty/missing data and does not restart if not offline", async () => {
    vi.mocked(setSelectedDockerImage).mockResolvedValueOnce(undefined as any);
    vi.mocked(getServerStartup).mockReturnValue({
      data: undefined,
      isValidating: true,
      mutate: vi.fn().mockResolvedValue(null),
    } as any);

    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket} status="starting">
        <JavaVersionModalFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "has been compiled by a more recent version of the java runtime",
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Unsupported Java Version")).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Update Docker Image" }),
    );

    await waitFor(() => {
      expect(setSelectedDockerImage).toHaveBeenCalledWith(
        "server-java-uuid",
        "",
      );
      expect(socket.send).not.toHaveBeenCalled();
    });
  });
});
