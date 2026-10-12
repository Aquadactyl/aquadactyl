import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useWebsocketEvent from "./useWebsocketEvent";
import { SocketEvent } from "@/components/server/events";

let mockSocketState: { connected: boolean; instance: any } = {
  connected: false,
  instance: null,
};

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        socket: mockSocketState,
      }),
  },
}));

describe("plugins/useWebsocketEvent", () => {
  let mockInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInstance = {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    mockSocketState = {
      connected: false,
      instance: null,
    };
  });

  it("registers listener when socket is connected with valid instance", () => {
    mockSocketState = {
      connected: true,
      instance: mockInstance,
    };

    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      useWebsocketEvent("stats" as SocketEvent, callback),
    );

    expect(mockInstance.addListener).toHaveBeenCalledWith(
      "stats",
      expect.any(Function),
    );

    // Trigger listener
    const listener = mockInstance.addListener.mock.calls[0][1];
    listener("data-payload");
    expect(callback).toHaveBeenCalledWith("data-payload");

    unmount();
    expect(mockInstance.removeListener).toHaveBeenCalledWith(
      "stats",
      expect.any(Function),
    );
  });

  it("does not register listener if not connected or instance is null", () => {
    // Both false / null
    const callback1 = vi.fn();
    const { unmount: unmount1 } = renderHook(() =>
      useWebsocketEvent("console output" as SocketEvent, callback1),
    );
    expect(mockInstance.addListener).not.toHaveBeenCalled();
    expect(() => unmount1()).not.toThrow();

    // Connected true, but instance null
    mockSocketState = { connected: true, instance: null };
    const callback2 = vi.fn();
    const { unmount: unmount2 } = renderHook(() =>
      useWebsocketEvent("daemon message" as SocketEvent, callback2),
    );
    expect(mockInstance.addListener).not.toHaveBeenCalled();
    expect(() => unmount2()).not.toThrow();

    // Connected false, but instance provided
    mockSocketState = { connected: false, instance: mockInstance };
    const callback3 = vi.fn();
    const { unmount: unmount3 } = renderHook(() =>
      useWebsocketEvent("daemon message" as SocketEvent, callback3),
    );
    expect(mockInstance.addListener).not.toHaveBeenCalled();
    expect(() => unmount3()).not.toThrow();
  });

  it("updates callback ref without re-registering listener", () => {
    mockSocketState = {
      connected: true,
      instance: mockInstance,
    };

    let callCount = 0;
    const { rerender } = renderHook(
      ({ cb }) => useWebsocketEvent("stats" as SocketEvent, cb),
      {
        initialProps: {
          cb: () => {
            callCount += 1;
          },
        },
      },
    );

    expect(mockInstance.addListener).toHaveBeenCalledTimes(1);

    // Rerender with updated callback
    rerender({
      cb: () => {
        callCount += 10;
      },
    });

    expect(mockInstance.addListener).toHaveBeenCalledTimes(1);

    const listener = mockInstance.addListener.mock.calls[0][1];
    listener("test");
    expect(callCount).toBe(10);
  });
});
