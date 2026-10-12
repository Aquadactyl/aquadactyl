import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScrollDownHelperAddon } from "./XtermScrollDownHelperAddon";

describe("plugins/XtermScrollDownHelperAddon", () => {
  let terminalMock: any;
  let scrollCallback: () => void;
  let lineFeedCallback: () => void;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
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
      }),
      onLineFeed: vi.fn((cb) => {
        lineFeedCallback = cb;
      }),
    };
  });

  it("activates properly, registers listeners and appends button element", () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);

    expect(terminalMock.onScroll).toHaveBeenCalled();
    expect(terminalMock.onLineFeed).toHaveBeenCalled();

    const button = container.querySelector("div");
    expect(button).not.toBeNull();
    addon.show();
    expect(button?.style.visibility).toBe("visible");
  });

  it("clicking the button triggers terminal.scrollToBottom", () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);

    const button = container.querySelector("div");
    button?.click();

    expect(terminalMock.scrollToBottom).toHaveBeenCalled();
  });

  it("hides when scrolled to bottom on scroll event", () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);

    const button = container.querySelector("div");
    addon.show();
    expect(button?.style.visibility).toBe("visible");

    terminalMock.buffer.active.viewportY = 10;
    terminalMock.buffer.active.baseY = 10;
    scrollCallback();

    expect(button?.style.visibility).toBe("hidden");
  });

  it("shows when line feed occurs and not scrolled down", () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);

    const button = container.querySelector("div");
    addon.hide();
    expect(button?.style.visibility).toBe("hidden");

    terminalMock.buffer.active.viewportY = 5;
    terminalMock.buffer.active.baseY = 10;
    lineFeedCallback();

    expect(button?.style.visibility).toBe("visible");
  });

  it("does not show on line feed if already scrolled down", () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);

    const button = container.querySelector("div");
    addon.hide();

    terminalMock.buffer.active.viewportY = 10;
    terminalMock.buffer.active.baseY = 10;
    lineFeedCallback();

    expect(button?.style.visibility).toBe("hidden");
  });

  it("show handles missing terminal or missing terminal.element", () => {
    const addon = new ScrollDownHelperAddon();
    // No activate called, show should return early without throwing
    expect(() => addon.show()).not.toThrow();

    (addon as any).terminal = {};
    expect(() => addon.show()).not.toThrow();
  });

  it("does not hide on scroll if not scrolled down to bottom", () => {
    const addon = new ScrollDownHelperAddon();
    addon.activate(terminalMock);

    const button = container.querySelector("div");
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

  it("dispose runs without error", () => {
    const addon = new ScrollDownHelperAddon();
    expect(() => addon.dispose()).not.toThrow();
  });
});
