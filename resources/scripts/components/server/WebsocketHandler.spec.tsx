import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import WebsocketHandler from "./WebsocketHandler";
import getWebsocketToken from "@/api/server/getWebsocketToken";

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <span data-testid="spinner" />,
}));

vi.mock("@/components/elements/Fade", () => ({
  default: ({ children, in: inProp }: any) => (inProp ? <>{children}</> : null),
}));

vi.mock("@/api/server/getWebsocketToken", () => ({
  default: vi.fn().mockResolvedValue({
    token: "jwt_token_123",
    socket: "wss://node.test/ws",
  }),
}));

let socketListeners: Record<string, (...args: any[]) => void> = {};
const mockSocketInstance = {
  on: vi.fn((event: string, cb: any) => {
    socketListeners[event] = cb;
  }),
  setToken: vi.fn().mockReturnThis(),
  connect: vi.fn().mockReturnThis(),
  close: vi.fn(),
};

vi.mock("@/plugins/Websocket", () => {
  class MockWebsocket {
    on = mockSocketInstance.on;
    setToken = mockSocketInstance.setToken;
    connect = mockSocketInstance.connect;
    close = mockSocketInstance.close;
  }
  return { Websocket: MockWebsocket };
});

const mockSetServerStatus = vi.fn();
const mockSetInstance = vi.fn();
const mockSetConnectionState = vi.fn();

let mockState = {
  socket: { connected: false, instance: null as any },
  server: { data: { uuid: "srv-uuid-1" } as any },
};

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) => selector(mockState),
    useStoreActions: (selector: any) =>
      selector({
        status: { setServerStatus: mockSetServerStatus },
        socket: {
          setInstance: mockSetInstance,
          setConnectionState: mockSetConnectionState,
        },
      }),
  },
}));

describe("components/server/WebsocketHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketListeners = {};
    mockState = {
      socket: { connected: false, instance: null },
      server: { data: { uuid: "srv-uuid-1" } },
    };
  });

  it("initiates connection and registers socket listeners on mount", async () => {
    render(<WebsocketHandler />);

    expect(getWebsocketToken).toHaveBeenCalledWith("srv-uuid-1");

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSocketInstance.setToken).toHaveBeenCalledWith("jwt_token_123");
    expect(mockSocketInstance.connect).toHaveBeenCalledWith(
      "wss://node.test/ws",
    );
    expect(mockSetInstance).toHaveBeenCalled();
  });

  it("handles auth success and socket close events", () => {
    render(<WebsocketHandler />);

    expect(socketListeners["auth success"]).toBeDefined();
    expect(socketListeners["SOCKET_CLOSE"]).toBeDefined();

    socketListeners["auth success"]();
    expect(mockSetConnectionState).toHaveBeenCalledWith(true);

    socketListeners["SOCKET_CLOSE"]();
    expect(mockSetConnectionState).toHaveBeenCalledWith(false);
  });

  it("handles status and daemon error events", () => {
    render(<WebsocketHandler />);

    socketListeners["status"]("running");
    expect(mockSetServerStatus).toHaveBeenCalledWith("running");

    // Daemon error logs warning
    expect(() =>
      socketListeners["daemon error"]("Some daemon warn"),
    ).not.toThrow();
  });

  it("handles socket error and connect error states", () => {
    const { getByText, getByTestId } = render(<WebsocketHandler />);

    act(() => {
      socketListeners["SOCKET_ERROR"]();
    });
    expect(mockSetConnectionState).toHaveBeenCalledWith(false);
    expect(getByTestId("spinner")).toBeDefined();
    expect(getByText(/having some trouble connecting/)).toBeDefined();

    act(() => {
      socketListeners["SOCKET_CONNECT_ERROR"]();
    });
    expect(getByText(/Failed to connect to websocket/)).toBeDefined();
  });

  it("handles token expiration events by refreshing token", async () => {
    render(<WebsocketHandler />);

    vi.mocked(getWebsocketToken).mockClear();
    vi.mocked(getWebsocketToken).mockResolvedValueOnce({
      token: "new_token",
      socket: "wss://node.test/ws",
    });

    await act(async () => {
      socketListeners["token expiring"]();
    });

    expect(getWebsocketToken).toHaveBeenCalledWith("srv-uuid-1");
  });

  it("handles jwt error with reconnect on expired claim", async () => {
    render(<WebsocketHandler />);

    vi.mocked(getWebsocketToken).mockClear();
    vi.mocked(getWebsocketToken).mockResolvedValueOnce({
      token: "renewed_token",
      socket: "wss://node.test/ws",
    });

    await act(async () => {
      socketListeners["jwt error"]("jwt: exp claim is invalid");
    });

    expect(mockSetConnectionState).toHaveBeenCalledWith(false);
    expect(getWebsocketToken).toHaveBeenCalledWith("srv-uuid-1");
  });

  it("displays error message on fatal jwt validation error", () => {
    const { getByText } = render(<WebsocketHandler />);

    act(() => {
      socketListeners["jwt error"]("invalid signature");
    });

    expect(mockSetConnectionState).toHaveBeenCalledWith(false);
    expect(
      getByText(/There was an error validating the credentials/),
    ).toBeDefined();
  });

  it("handles transfer status events", () => {
    render(<WebsocketHandler />);

    // starting and success return early
    socketListeners["transfer status"]("starting");
    socketListeners["transfer status"]("success");
    expect(mockSocketInstance.close).not.toHaveBeenCalled();

    // other transfer status forces reconnection
    act(() => {
      socketListeners["transfer status"]("processing");
    });

    expect(mockSocketInstance.close).toHaveBeenCalled();
    expect(mockSetConnectionState).toHaveBeenCalledWith(false);
    expect(mockSetInstance).toHaveBeenCalledWith(null);
  });

  it("closes socket instance on unmount", () => {
    const closeSpy = vi.fn();
    mockState.socket.instance = { close: closeSpy } as any;

    const { unmount } = render(<WebsocketHandler />);
    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  it("handles token expired and concurrent updateToken guard", async () => {
    render(<WebsocketHandler />);

    vi.mocked(getWebsocketToken).mockClear();
    let resolveToken: any;
    vi.mocked(getWebsocketToken).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveToken = resolve;
      }),
    );

    // First call sets updatingToken = true
    act(() => {
      socketListeners["token expired"]();
    });
    expect(getWebsocketToken).toHaveBeenCalledTimes(1);

    // Second call while pending returns early (updatingToken guard)
    act(() => {
      socketListeners["token expiring"]();
    });
    expect(getWebsocketToken).toHaveBeenCalledTimes(1);

    // Resolve first call
    await act(async () => {
      resolveToken({ token: "done_token", socket: "wss://node.test/ws" });
    });
  });

  it("handles error during token update and initial connection failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Token update error
    render(<WebsocketHandler />);
    vi.mocked(getWebsocketToken).mockRejectedValueOnce(
      new Error("Refresh failed"),
    );
    await act(async () => {
      socketListeners["token expiring"]();
    });
    expect(consoleSpy).toHaveBeenCalled();

    // Initial connection getWebsocketToken failure
    vi.mocked(getWebsocketToken).mockRejectedValueOnce(
      new Error("Connect failed"),
    );
    render(<WebsocketHandler />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("clears error on connected state change and exits early without uuid", () => {
    mockState.socket.connected = false;
    const { rerender, getByText, queryByText } = render(<WebsocketHandler />);

    act(() => {
      socketListeners["SOCKET_ERROR"]();
    });
    expect(getByText(/having some trouble connecting/)).toBeDefined();

    // Re-render with connected = true
    mockState.socket.connected = true;
    rerender(<WebsocketHandler />);
    expect(queryByText(/having some trouble connecting/)).toBeNull();

    // Re-render with connected = false (branch when connected is falsy)
    mockState.socket.connected = false;
    rerender(<WebsocketHandler />);

    // Test early return when uuid is missing
    mockState.server.data = null as any;
    rerender(<WebsocketHandler />);
  });
});
