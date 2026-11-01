import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import GSLTokenModalFeature from "@/components/server/features/GSLTokenModalFeature";
import { ServerContext } from "@/state/server";
import { SocketEvent, SocketRequest } from "@/components/server/events";
import updateStartupVariable from "@/api/server/updateStartupVariable";
import EventEmitter from "events";

vi.mock("@/api/server/updateStartupVariable");

const mockClearFlashes = vi.fn();
const mockClearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearFlashes: mockClearFlashes,
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

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
      uuid: "server-gsl-uuid",
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

describe("GSLTokenModalFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows modal when GSL token expired error is detected in console", async () => {
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <GSLTokenModalFeature />
      </Wrapper>,
    );

    expect(screen.queryByText("Invalid GSL token!")).toBeNull();

    // Emit non-matching console line (does not open modal)
    act(() => {
      socket.emit(SocketEvent.CONSOLE_OUTPUT, "Server is starting up normally");
    });
    expect(screen.queryByText("Invalid GSL token!")).toBeNull();

    // Emit console line
    act(() => {
      socket.emit(
        SocketEvent.CONSOLE_OUTPUT,
        "Logging into Steam... (gsl token expired)",
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid GSL token!")).toBeDefined();
    });
  });

  it("updates startup variable and restarts server on submit", async () => {
    vi.mocked(updateStartupVariable).mockResolvedValueOnce(undefined as any);
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <GSLTokenModalFeature />
      </Wrapper>,
    );

    // Trigger modal
    act(() => {
      socket.emit(SocketEvent.CONSOLE_OUTPUT, "Error (account not found)");
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid GSL token!")).toBeDefined();
    });

    const input = screen.getByLabelText("GSL Token");
    fireEvent.change(input, { target: { value: "NEW_TOKEN_123" } });
    fireEvent.click(screen.getByRole("button", { name: "Update GSL Token" }));

    await waitFor(() => {
      expect(updateStartupVariable).toHaveBeenCalledWith(
        "server-gsl-uuid",
        "STEAM_ACC",
        "NEW_TOKEN_123",
      );
      expect(socket.send).toHaveBeenCalledWith(
        SocketRequest.SET_STATE,
        "restart",
      );
    });
  });

  it("handles update failure and sets http error flash", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(updateStartupVariable).mockRejectedValueOnce(
      new Error("Update failed"),
    );
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <GSLTokenModalFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(SocketEvent.CONSOLE_OUTPUT, "Error (account not found)");
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid GSL token!")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Update GSL Token" }));

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it("dismisses modal via close-icon", async () => {
    const socket = createMockSocket();

    render(
      <Wrapper socketMock={socket}>
        <GSLTokenModalFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(SocketEvent.CONSOLE_OUTPUT, "Error (account not found)");
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid GSL token!")).toBeDefined();
    });

    const closeIcon = document.querySelector(".close-icon")!;
    fireEvent.click(closeIcon);
    await waitFor(() => {
      expect(screen.queryByText("Invalid GSL token!")).toBeNull();
    });
  });

  it("updates variable without socket restart when instance is null", async () => {
    vi.mocked(updateStartupVariable).mockResolvedValueOnce(undefined as any);
    const socket = createMockSocket();

    const { rerender } = render(
      <Wrapper socketMock={socket}>
        <GSLTokenModalFeature />
      </Wrapper>,
    );

    act(() => {
      socket.emit(SocketEvent.CONSOLE_OUTPUT, "Error (account not found)");
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid GSL token!")).toBeDefined();
    });

    // Remove socket instance
    rerender(
      <Wrapper socketMock={null}>
        <GSLTokenModalFeature />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update GSL Token" }));

    await waitFor(() => {
      expect(updateStartupVariable).toHaveBeenCalled();
    });
  });
});
