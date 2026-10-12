import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Websocket } from "./Websocket";

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  onclose: ((evt: { code: number }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
  }
}

describe("plugins/Websocket", () => {
  let originalWebSocket: any;
  let latestSocket: MockWebSocket | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    originalWebSocket = globalThis.WebSocket;
    latestSocket = null;

    globalThis.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        latestSocket = this;
      }
    } as any;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  it("adds, emits, and removes listeners correctly", () => {
    const ws = new Websocket();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    ws.on("custom_event", fn1);
    ws.addListener("custom_event", fn2);

    expect(ws.emit("custom_event", "arg1", 123)).toBe(true);
    expect(fn1).toHaveBeenCalledWith("arg1", 123);
    expect(fn2).toHaveBeenCalledWith("arg1", 123);

    ws.off("custom_event", fn1);
    ws.emit("custom_event", "arg2");
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledWith("arg2");

    ws.removeListener("custom_event", fn2);
    expect(ws.emit("custom_event")).toBe(false);

    ws.on("e1", fn1);
    ws.on("e2", fn2);
    ws.removeAllListeners("e1");
    expect(ws.emit("e1")).toBe(false);
    expect(ws.emit("e2")).toBe(true);

    ws.removeAllListeners();
    expect(ws.emit("e2")).toBe(false);
  });

  it("connects and initializes socket, emitting SOCKET_OPEN and authenticating", () => {
    const ws = new Websocket();
    const openListener = vi.fn();
    ws.on("SOCKET_OPEN", openListener);
    ws.setToken("my-token");

    ws.connect("wss://example.com/ws");
    expect(latestSocket).not.toBeNull();
    expect(latestSocket?.url).toBe("wss://example.com/ws");

    latestSocket?.onopen?.();
    expect(openListener).toHaveBeenCalled();
    expect(latestSocket?.send).toHaveBeenCalledWith(
      JSON.stringify({ event: "auth", args: ["my-token"] }),
    );
  });

  it("handles incoming messages with and without args", () => {
    const ws = new Websocket();
    const messageListener = vi.fn();
    ws.on("daemon_output", messageListener);
    ws.connect("wss://example.com/ws");

    latestSocket?.onmessage?.({
      data: JSON.stringify({
        event: "daemon_output",
        args: ["line 1", "line 2"],
      }),
    });
    expect(messageListener).toHaveBeenCalledWith("line 1", "line 2");

    const simpleListener = vi.fn();
    ws.on("ping", simpleListener);
    latestSocket?.onmessage?.({
      data: JSON.stringify({ event: "ping" }),
    });
    expect(simpleListener).toHaveBeenCalled();

    // Malformed JSON should not throw
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    latestSocket?.onmessage?.({ data: "not json" });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("handles socket errors", () => {
    const ws = new Websocket();
    const errorListener = vi.fn();
    ws.on("SOCKET_ERROR", errorListener);
    ws.connect("wss://example.com/ws");

    const err = new Error("Connection failed");
    latestSocket?.onerror?.(err);
    expect(errorListener).toHaveBeenCalledWith(err);
  });

  it("handles close codes 4400 and 4409 by closing permanently", () => {
    const ws = new Websocket();
    const closeListener = vi.fn();
    ws.on("SOCKET_CLOSE", closeListener);
    ws.connect("wss://example.com/ws");

    latestSocket?.onclose?.({ code: 4400 });
    expect(closeListener).toHaveBeenCalled();
    expect(latestSocket?.close).toHaveBeenCalledWith(1000, undefined);
  });

  it("attempts reconnect on regular close up to max attempts", () => {
    const ws = new Websocket();
    const reconnectListener = vi.fn();
    const errorListener = vi.fn();
    ws.on("SOCKET_RECONNECT", reconnectListener);
    ws.on("SOCKET_CONNECT_ERROR", errorListener);
    ws.connect("wss://example.com/ws");

    // Close unexpectedly
    latestSocket?.onclose?.({ code: 1006 });
    expect(reconnectListener).toHaveBeenCalledTimes(1);

    // Advance timer to trigger reconnect
    vi.advanceTimersByTime(1000);
    expect(latestSocket).not.toBeNull();

    // Trigger closes until max attempts (20)
    for (let i = 2; i <= 20; i++) {
      latestSocket?.onclose?.({ code: 1006 });
      vi.advanceTimersByTime(1000);
    }

    // Next close should emit SOCKET_CONNECT_ERROR
    latestSocket?.onclose?.({ code: 1006 });
    expect(errorListener).toHaveBeenCalled();
  });

  it("updates token and calls authenticate when isUpdate is true", () => {
    const ws = new Websocket();
    ws.connect("wss://example.com/ws");
    latestSocket?.onopen?.();

    ws.setToken("new-token", true);
    expect(latestSocket?.send).toHaveBeenCalledWith(
      JSON.stringify({ event: "auth", args: ["new-token"] }),
    );
  });

  it("manual close closes the socket and prevents reconnection", () => {
    const ws = new Websocket();
    ws.connect("wss://example.com/ws");
    const reconnectListener = vi.fn();
    ws.on("SOCKET_RECONNECT", reconnectListener);

    ws.close(1000, "Normal closure");
    expect(reconnectListener).not.toHaveBeenCalled();
  });

  it("reconnect closes and reopens socket", () => {
    const ws = new Websocket();
    ws.connect("wss://example.com/ws");
    const prevSocket = latestSocket;

    ws.reconnect();
    expect(prevSocket?.close).toHaveBeenCalled();
  });

  it("send sends formatted event payload", () => {
    const ws = new Websocket();
    ws.connect("wss://example.com/ws");

    ws.send("set_state", "restart");
    expect(latestSocket?.send).toHaveBeenCalledWith(
      JSON.stringify({ event: "set_state", args: ["restart"] }),
    );

    ws.send("set_state", ["kill", "now"]);
    expect(latestSocket?.send).toHaveBeenCalledWith(
      JSON.stringify({ event: "set_state", args: ["kill", "now"] }),
    );
  });
});
