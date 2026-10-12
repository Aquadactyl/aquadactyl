import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Console from "./Console";
import { SocketEvent, SocketRequest } from "@/components/server/events";

const mockTerminal = {
  element: null as any,
  open: vi.fn((el) => {
    mockTerminal.element = el;
  }),
  loadAddon: vi.fn(),
  writeln: vi.fn(),
  clear: vi.fn(),
  attachCustomKeyEventHandler: vi.fn(),
  unicode: { activeVersion: "10" },
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
  ScrollDownHelperAddon: class {},
}));

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: () => null,
}));

vi.mock("@blueprint/components/Server/Terminal/CommandRow", () => ({
  default: () => null,
}));

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
    mockTerminal.element = null;
    socketListeners = {};
    mockCanSendCommands = true;
    mockHistory = ["help", "status"];
    mockServerState = {
      socket: { connected: true, instance: mockSocketInstance },
      server: { data: { id: "srv-1", isTransferring: false } },
      status: { value: "running" },
    };
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

  it("renders command input when user has permissions and sends command on Enter", () => {
    render(<Console />);

    const input = screen.getByLabelText(
      "Console command input.",
    ) as HTMLInputElement;
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: "stop" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockSocketInstance.send).toHaveBeenCalledWith(
      "send command",
      "stop",
    );
    expect(mockSetHistory).toHaveBeenCalled();
  });

  it("navigates through command history with ArrowUp and ArrowDown", () => {
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

    // Arrow down moves forward
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.value).toBe("help");
  });

  it("does not render input when permission is false", () => {
    mockCanSendCommands = false;
    render(<Console />);

    expect(screen.queryByLabelText("Console command input.")).toBeNull();
  });

  it("handles incoming socket output events", () => {
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
  });

  it("cleans up socket listeners when unmounting", () => {
    const { unmount } = render(<Console />);
    unmount();

    expect(mockSocketInstance.removeListener).toHaveBeenCalled();
  });
});
