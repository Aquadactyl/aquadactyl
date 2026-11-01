import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import InstallListener from "./InstallListener";
import { SocketEvent } from "@/components/server/events";
import { mutateGlobal } from "@/lib/queryClient";

const websocketListeners: Record<string, Function> = {};
const mockGetServer = vi.fn();
const mockSetServerFromState = vi.fn();

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: { uuid: "server-uuid-123" },
        },
      }),
    useStoreActions: (selector: any) =>
      selector({
        server: {
          getServer: mockGetServer,
          setServerFromState: mockSetServerFromState,
        },
      }),
  },
}));

vi.mock("@/plugins/useWebsocketEvent", () => ({
  default: (event: string, callback: Function) => {
    websocketListeners[event] = callback;
  },
}));

vi.mock("@/lib/queryClient", () => ({
  mutateGlobal: vi.fn(),
}));

vi.mock("@/plugins/useFileManagerQuery", () => ({
  getDirectoryQueryKey: (uuid: string, path: string) => `dir:${uuid}:${path}`,
}));

describe("components/server/InstallListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles BACKUP_RESTORE_COMPLETED event", () => {
    render(<InstallListener />);

    expect(
      websocketListeners[SocketEvent.BACKUP_RESTORE_COMPLETED],
    ).toBeDefined();
    websocketListeners[SocketEvent.BACKUP_RESTORE_COMPLETED]();

    expect(mutateGlobal).toHaveBeenCalledWith("dir:server-uuid-123:/");
    expect(mockSetServerFromState).toHaveBeenCalled();
    const updater = mockSetServerFromState.mock.calls[0][0];
    expect(updater({ status: "restoring" })).toEqual({ status: null });
  });

  it("handles INSTALL_COMPLETED event and catches errors", async () => {
    mockGetServer.mockRejectedValueOnce(new Error("Network failure"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<InstallListener />);

    expect(websocketListeners[SocketEvent.INSTALL_COMPLETED]).toBeDefined();
    await websocketListeners[SocketEvent.INSTALL_COMPLETED]();

    expect(mockGetServer).toHaveBeenCalledWith("server-uuid-123");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles INSTALL_STARTED event", () => {
    render(<InstallListener />);

    expect(websocketListeners[SocketEvent.INSTALL_STARTED]).toBeDefined();
    websocketListeners[SocketEvent.INSTALL_STARTED]();

    expect(mockSetServerFromState).toHaveBeenCalled();
    const updater = mockSetServerFromState.mock.calls[0][0];
    expect(updater({ status: "offline" })).toEqual({ status: "installing" });
  });
});
