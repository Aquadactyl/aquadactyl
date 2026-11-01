import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { ScrollDownHelperAddon } from "./XtermScrollDownHelperAddon";

describe("plugins/XtermScrollDownHelperAddon", () => {
  let terminalMock: any;
  let scrollCallback: () => void;
  let lineFeedCallback: () => void;
  let container: HTMLDivElement;
  let mockScrollDisposable: { dispose: ReturnType<typeof vi.fn> };
  let mockLineFeedDisposable: { dispose: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = document.createElement("div");
    mockScrollDisposable = { dispose: vi.fn() };
    mockLineFeedDisposable = { dispose: vi.fn() };
    terminalMock = {
      element: container,
      buffer: {
        active: {
          viewportY: 10,
          baseY: 10,
        },
      },
      scrollToBottom: vi.fn(),
      onScroll: vi.fn((cb) => {
        scrollCallback = cb;
        return mockScrollDisposable;
      }),
      onLineFeed: vi.fn((cb) => {
        lineFeedCallback = cb;
        return mockLineFeedDisposable;
      }),
    };
  });

  it("activates properly, registers listeners and appends button element on show", async () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);

    expect(terminalMock.onScroll).toHaveBeenCalled();
    expect(terminalMock.onLineFeed).toHaveBeenCalled();

    expect(container.querySelector("button")).toBeNull();

    await act(async () => {
      addon.show();
    });

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-label")).toBe("Scroll to latest output");

    addon.show();
    expect(button?.style.visibility).toBe("visible");
  });

  it("clicking the button triggers terminal.scrollToBottom and hides", async () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);
    await act(async () => {
      addon.show();
    });

    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    button?.click();
    expect(terminalMock.scrollToBottom).toHaveBeenCalled();
    expect(button?.style.visibility).toBe("hidden");
  });

  it("updates label via setLabel both before and after button creation", async () => {
    const addon = new ScrollDownHelperAddon();
    addon.setLabel("Custom Scroll");
    addon.activate(terminalMock);
    await act(async () => {
      addon.show();
    });

    const button = container.querySelector("button");
    expect(button?.title).toBe("Custom Scroll");
    expect(button?.getAttribute("aria-label")).toBe("Custom Scroll");

    addon.setLabel("New Label");
    expect(button?.title).toBe("New Label");
    expect(button?.getAttribute("aria-label")).toBe("New Label");
  });

  it("hides when scrolled to bottom on scroll event", async () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);
    await act(async () => {
      addon.show();
    });

    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    terminalMock.buffer.active.viewportY = 10;
    terminalMock.buffer.active.baseY = 10;
    scrollCallback();

    expect(button?.style.visibility).toBe("hidden");

    addon.show();
    expect(button?.style.visibility).toBe("visible");
  });

  it("shows when line feed occurs and not scrolled down", async () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);
    await act(async () => {
      addon.show();
    });

    const button = container.querySelector("button");
    addon.hide();
    expect(button?.style.visibility).toBe("hidden");

    terminalMock.buffer.active.viewportY = 5;
    terminalMock.buffer.active.baseY = 10;
    lineFeedCallback();

    expect(button?.style.visibility).toBe("visible");
  });

  it("does not show on line feed if already scrolled down", async () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);
    await act(async () => {
      addon.show();
    });

    const button = container.querySelector("button");
    addon.hide();

    terminalMock.buffer.active.viewportY = 10;
    terminalMock.buffer.active.baseY = 10;
    lineFeedCallback();

    expect(button?.style.visibility).toBe("hidden");
  });

  it("show handles missing terminal or missing terminal.element", () => {
    const addon = new ScrollDownHelperAddon();
    expect(() => addon.show()).not.toThrow();

    (addon as any).terminal = {};
    expect(() => addon.show()).not.toThrow();
  });

  it("does not hide on scroll if not scrolled down to bottom", async () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);
    await act(async () => {
      addon.show();
    });

    const button = container.querySelector("button");
    addon.hide();
    expect(button?.style.visibility).toBe("hidden");
    addon.show();
    expect(button?.style.visibility).toBe("visible");

    terminalMock.buffer.active.viewportY = 2;
    terminalMock.buffer.active.baseY = 10;
    scrollCallback();

    expect(button?.style.visibility).toBe("visible");
  });

  it("hide does not throw when element is undefined", () => {
    const addon = new ScrollDownHelperAddon();
    expect(() => addon.hide()).not.toThrow();
  });

  it("dispose unmounts iconRoot, disposes listeners, and removes button element", async () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);
    await act(async () => {
      addon.show();
    });

    expect(container.querySelector("button")).not.toBeNull();

    await act(async () => {
      addon.dispose();
    });
    expect(container.querySelector("button")).toBeNull();
    expect(mockScrollDisposable.dispose).toHaveBeenCalled();
    expect(mockLineFeedDisposable.dispose).toHaveBeenCalled();
  });
});
