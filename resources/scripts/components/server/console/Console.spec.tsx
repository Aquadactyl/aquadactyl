import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Console from "./Console";
import { SocketEvent, SocketRequest } from "@/components/server/events";

let customKeyEventHandler: ((e: any) => boolean) | null = null;
const mockTerminal = {
  element: null as any,
  open: vi.fn((el) => {
    mockTerminal.element = el;
  }),
  loadAddon: vi.fn(),
  writeln: vi.fn(),
  clear: vi.fn(),
  attachCustomKeyEventHandler: vi.fn((handler) => {
    customKeyEventHandler = handler;
  }),
  unicode: { activeVersion: "10" },
  buffer: {
    active: {
      length: 0,
      getLine: vi.fn(),
    },
  },
};

vi.mock("@xterm/xterm", () => {
  class MockTerminal {
    constructor() {
      return mockTerminal;
    }
  }
  return { Terminal: MockTerminal };
});

const mockFit = vi.fn();
vi.mock("@xterm/addon-fit", () => {
  class MockFitAddon {
    fit = mockFit;
  }
  return { FitAddon: MockFitAddon };
});

vi.mock("@xterm/addon-search", () => ({
  SearchAddon: class {},
}));

const mockSearchBar = {
  addNewStyle: vi.fn(),
  show: vi.fn(),
  hidden: vi.fn(),
};

vi.mock("@kingironman2011/xterm-addon-search-bar", () => {
  class MockSearchBarAddon {
    addNewStyle = mockSearchBar.addNewStyle;
    show = mockSearchBar.show;
    hidden = mockSearchBar.hidden;
  }
  return { SearchBarAddon: MockSearchBarAddon };
});

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: class {},
}));

vi.mock("@xterm/addon-unicode11", () => ({
  Unicode11Addon: class {},
}));

vi.mock("@/plugins/XtermScrollDownHelperAddon", () => ({
  ScrollDownHelperAddon: class {
    setLabel = vi.fn();
  },
}));

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible }: any) =>
    visible ? <div data-testid="spinner-overlay" /> : null,
}));

vi.mock("@blueprint/components/Server/Terminal/CommandRow", () => ({
  default: () => null,
}));

vi.mock("@/components/server/console/ConsoleLogShareButton", () => ({
  default: ({ getLogs }: any) => {
    getLogs?.();
    return null;
  },
}));

let resizeObserverCallback: (() => void) | null = null;

let mockCanSendCommands = true;
vi.mock("@/plugins/usePermissions", () => ({
  usePermissions: () => [mockCanSendCommands],
}));

let mockHistory: string[] = ["help", "status"];
const mockSetHistory = vi.fn((updater) => {
  if (typeof updater === "function") {
    mockHistory = updater(mockHistory);
  } else {
    mockHistory = updater;
  }
});
vi.mock("@/plugins/usePersistedState", () => ({
  usePersistedState: () => [mockHistory, mockSetHistory],
}));

let socketListeners: Record<string, (...args: any[]) => void> = {};
const mockSocketInstance = {
  send: vi.fn(),
  addListener: vi.fn((event: string, cb: any) => {
    socketListeners[event] = cb;
  }),
  removeListener: vi.fn((event: string) => {
    delete socketListeners[event];
  }),
};

let mockServerState = {
  socket: { connected: true, instance: mockSocketInstance as any },
  server: { data: { id: "srv-1", isTransferring: false } },
  status: { value: "running" },
};

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) => selector(mockServerState),
  },
}));

describe("components/server/console/Console", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    customKeyEventHandler = null;
    mockTerminal.element = null;
    socketListeners = {};
    mockCanSendCommands = true;
    mockHistory = ["help", "status"];
    mockServerState = {
      socket: { connected: true, instance: mockSocketInstance },
      server: { data: { id: "srv-1", isTransferring: false } },
      status: { value: "running" },
    };
    resizeObserverCallback = null;
    global.ResizeObserver = class {
      constructor(cb: any) {
        resizeObserverCallback = cb;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fits addon on resize observer callback", () => {
    vi.useFakeTimers();
    render(<Console />);
    expect(resizeObserverCallback).not.toBeNull();
    mockFit.mockClear();
    act(() => {
      resizeObserverCallback?.();
      vi.advanceTimersByTime(50);
    });
    expect(mockFit).toHaveBeenCalled();
  });

  it("renders console container and attaches addons when connected", () => {
    render(<Console />);

    expect(mockTerminal.open).toHaveBeenCalled();
    expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(6);
    expect(mockFit).toHaveBeenCalled();
    expect(mockSocketInstance.send).toHaveBeenCalledWith(
      SocketRequest.SEND_LOGS,
    );
    expect(mockTerminal.writeln).toHaveBeenCalledWith(
      expect.stringContaining("Server marked as running..."),
    );
  });

  it("handles custom key event handler for copy, search, escape, and normal keys", () => {
    document.execCommand = vi.fn();
    render(<Console />);

    expect(customKeyEventHandler).not.toBeNull();

    // Ctrl+C copies
    const copyEvent = { ctrlKey: true, key: "c" };
    expect(customKeyEventHandler!(copyEvent)).toBe(false);
    expect(document.execCommand).toHaveBeenCalledWith("copy");

    // Meta+F opens search bar
    const searchEvent = { metaKey: true, key: "f", preventDefault: vi.fn() };
    expect(customKeyEventHandler!(searchEvent)).toBe(false);
    expect(searchEvent.preventDefault).toHaveBeenCalled();
    expect(mockSearchBar.show).toHaveBeenCalled();

    // Escape hides search bar
    const escapeEvent = { key: "Escape" };
    expect(customKeyEventHandler!(escapeEvent)).toBe(true);
    expect(mockSearchBar.hidden).toHaveBeenCalled();

    // Normal key returns true
    expect(customKeyEventHandler!({ key: "a" })).toBe(true);
  });

  it("handles window resize and triggers fitAddon", () => {
    vi.useFakeTimers();
    render(<Console />);

    window.dispatchEvent(new Event("resize"));
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(mockFit).toHaveBeenCalled();
  });

  it("renders command input when user has permissions and sends command on Enter", () => {
    render(<Console />);

    const input = screen.getByLabelText(
      "Console command input.",
    ) as HTMLInputElement;
    expect(input).toBeDefined();

    // Enter with empty value does not send
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockSocketInstance.send).not.toHaveBeenCalledWith(
      "send command",
      "",
    );

    // Enter with value sends command
    fireEvent.change(input, { target: { value: "stop" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockSocketInstance.send).toHaveBeenCalledWith(
      "send command",
      "stop",
    );
    expect(mockSetHistory).toHaveBeenCalled();
  });

  it("navigates through command history with ArrowUp and ArrowDown back to empty", () => {
    render(<Console />);

    const input = screen.getByLabelText(
      "Console command input.",
    ) as HTMLInputElement;

    // Arrow up retrieves first previous command
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("help");

    // Arrow up retrieves next previous command
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("status");

    // Arrow down moves back to help
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.value).toBe("help");

    // Arrow down moves back to empty (-1)
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.value).toBe("");
  });

  it("does not render input when permission is false", () => {
    mockCanSendCommands = false;
    render(<Console />);

    expect(screen.queryByLabelText("Console command input.")).toBeNull();
  });

  it("handles incoming socket output events including non-failure transfer status", () => {
    render(<Console />);

    // Console output
    act(() => {
      socketListeners[SocketEvent.CONSOLE_OUTPUT]("Loading terrain...\n");
    });
    expect(mockTerminal.writeln).toHaveBeenCalledWith(
      expect.stringContaining("Loading terrain..."),
    );

    // Daemon message (prefixed with prelude)
    act(() => {
      socketListeners[SocketEvent.DAEMON_MESSAGE](
        "Daemon starting container\n",
      );
    });
    expect(mockTerminal.writeln).toHaveBeenCalledWith(
      expect.stringContaining("container@aquadactyl~"),
    );

    // Daemon error
    act(() => {
      socketListeners[SocketEvent.DAEMON_ERROR]("Out of memory");
    });
    expect(mockTerminal.writeln).toHaveBeenCalledWith(
      expect.stringContaining("Out of memory"),
    );

    // Status change
    act(() => {
      socketListeners[SocketEvent.STATUS]("stopping");
    });
    expect(mockTerminal.writeln).toHaveBeenCalledWith(
      expect.stringContaining("Server marked as stopping..."),
    );

    // Transfer status failure
    act(() => {
      socketListeners[SocketEvent.TRANSFER_STATUS]("failure");
    });
    expect(mockTerminal.writeln).toHaveBeenCalledWith(
      expect.stringContaining("Transfer has failed."),
    );

    // Transfer status other
    act(() => {
      socketListeners[SocketEvent.TRANSFER_STATUS]("completed");
    });
  });

  it("does not clear console when server isTransferring is true", () => {
    mockServerState = {
      socket: { connected: true, instance: mockSocketInstance },
      server: { data: { id: "srv-1", isTransferring: true } },
      status: { value: "running" },
    };

    render(<Console />);

    expect(mockTerminal.clear).not.toHaveBeenCalled();
  });

  it("renders spinner overlay when socket is not connected and disables input", () => {
    mockServerState = {
      socket: { connected: false, instance: null },
      server: { data: { id: "srv-1", isTransferring: false } },
      status: { value: "" },
    };

    render(<Console />);

    expect(screen.getByTestId("spinner-overlay")).toBeDefined();
    const input = screen.getByLabelText(
      "Console command input.",
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("cleans up socket listeners when unmounting", () => {
    const { unmount } = render(<Console />);
    unmount();

    expect(mockSocketInstance.removeListener).toHaveBeenCalled();
  });

  it("handles ArrowUp with empty command history", () => {
    mockHistory = [];
    render(<Console />);

    const input = screen.getByLabelText(
      "Console command input.",
    ) as HTMLInputElement;

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("");
  });

  it("does not fit addon on resize when terminal.element is null", () => {
    vi.useFakeTimers();
    render(<Console />);
    mockFit.mockClear();
    mockTerminal.element = null;

    fireEvent(window, new Event("resize"));
    vi.advanceTimersByTime(200);

    expect(mockFit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("does not write status on mount when status is null", () => {
    mockServerState = {
      socket: { connected: true, instance: mockSocketInstance },
      server: { data: { id: "srv-1", isTransferring: false } },
      status: { value: null as any },
    };

    render(<Console />);

    expect(mockTerminal.writeln).not.toHaveBeenCalledWith(
      expect.stringContaining("Server marked as"),
    );
  });
});
