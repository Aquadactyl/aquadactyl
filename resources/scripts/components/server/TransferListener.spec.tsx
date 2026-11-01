import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import TransferListener from "./TransferListener";

let transferCallback: Function;
const mockGetServer = vi.fn();
const mockSetServerFromState = vi.fn();

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: { uuid: "srv-transfer-123" },
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
  default: (_event: string, callback: Function) => {
    transferCallback = callback;
  },
}));

describe("components/server/TransferListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles pending and processing transfer statuses", () => {
    render(<TransferListener />);

    transferCallback("pending");
    expect(mockSetServerFromState).toHaveBeenCalled();
    let updater = mockSetServerFromState.mock.calls[0][0];
    expect(updater({ isTransferring: false })).toEqual({
      isTransferring: true,
    });

    mockSetServerFromState.mockClear();
    transferCallback("processing");
    expect(mockSetServerFromState).toHaveBeenCalled();
    updater = mockSetServerFromState.mock.calls[0][0];
    expect(updater({ isTransferring: false })).toEqual({
      isTransferring: true,
    });
  });

  it("handles failed transfer status", () => {
    render(<TransferListener />);

    transferCallback("failed");
    expect(mockSetServerFromState).toHaveBeenCalled();
    const updater = mockSetServerFromState.mock.calls[0][0];
    expect(updater({ isTransferring: true })).toEqual({
      isTransferring: false,
    });
  });

  it("ignores unrecognized status", () => {
    render(<TransferListener />);

    transferCallback("in_progress");
    expect(mockSetServerFromState).not.toHaveBeenCalled();
    expect(mockGetServer).not.toHaveBeenCalled();
  });

  it("handles completed transfer status and catches getServer errors", async () => {
    mockGetServer.mockRejectedValueOnce(new Error("Server fetch error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<TransferListener />);

    await transferCallback("completed");
    expect(mockGetServer).toHaveBeenCalledWith("srv-transfer-123");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
