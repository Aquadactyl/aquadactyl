import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ServerRouter from "./ServerRouter";
import { MemoryRouter } from "react-router";

let mockServerState: any = {
  data: null,
  inConflictState: false,
};
const mockGetServer = vi.fn();
const mockClearServerState = vi.fn();

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: mockServerState,
      }),
    useStoreActions: (selector: any) =>
      selector({
        server: { getServer: mockGetServer },
        clearServerState: mockClearServerState,
      }),
  },
}));

let mockRootAdmin = false;
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: { data: { rootAdmin: mockRootAdmin } },
    }),
}));

vi.mock("@/components/NavigationBar", () => ({
  default: () => <nav data-testid="navigation-bar">NavBar</nav>,
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <div data-testid="spinner">Spinner</div>,
}));

vi.mock("@/components/elements/Fade", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/SubNavigation", () => ({
  default: ({ children }: any) => (
    <div data-testid="sub-navigation">{children}</div>
  ),
}));

vi.mock("@/components/elements/ScreenBlock", () => ({
  ServerError: ({ message }: any) => (
    <div data-testid="server-error">{message}</div>
  ),
}));

vi.mock("@/components/server/ConflictStateRenderer", () => ({
  default: () => <div data-testid="conflict-state">Conflict</div>,
}));

vi.mock("@/components/server/InstallListener", () => ({
  default: () => null,
}));
vi.mock("@/components/server/TransferListener", () => ({
  default: () => null,
}));
vi.mock("@/components/server/WebsocketHandler", () => ({
  default: () => null,
}));

vi.mock("@blueprint/extends/routers/ServerRouter", () => ({
  NavigationLinks: () => <div>NavLinks</div>,
  NavigationRouter: () => (
    <div data-testid="navigation-router">NavigationRouter</div>
  ),
}));

vi.mock(
  "@blueprint/components/Navigation/SubNavigation/BeforeSubNavigation",
  () => ({
    default: () => null,
  }),
);
vi.mock(
  "@blueprint/components/Navigation/SubNavigation/AdditionalServerItems",
  () => ({
    default: () => null,
  }),
);
vi.mock(
  "@blueprint/components/Navigation/SubNavigation/AfterSubNavigation",
  () => ({
    default: () => null,
  }),
);

describe("routers/ServerRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRootAdmin = false;
    mockServerState = {
      data: null,
      inConflictState: false,
    };
    mockGetServer.mockResolvedValue(undefined);
  });

  it("renders spinner when server is loading", () => {
    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <ServerRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("navigation-bar")).toBeDefined();
    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(mockGetServer).toHaveBeenCalled();
  });

  it("renders error block when server fetch fails", async () => {
    mockGetServer.mockRejectedValueOnce(new Error("Failed to load server"));

    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <ServerRouter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("server-error")).toBeDefined();
    });
  });

  it("renders server routes and subnavigation when server is loaded", () => {
    mockServerState.data = {
      id: "srv-1",
      uuid: "uuid-1",
      internalId: 10,
    };

    render(
      <MemoryRouter initialEntries={["/server/srv-1/console"]}>
        <ServerRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("sub-navigation")).toBeDefined();
    expect(screen.getByTestId("navigation-router")).toBeDefined();
    expect(screen.queryByTestId("conflict-state")).toBeNull();
  });

  it("renders conflict state renderer when server is in conflict state", () => {
    mockServerState.data = {
      id: "srv-1",
      uuid: "uuid-1",
      internalId: 10,
    };
    mockServerState.inConflictState = true;

    render(
      <MemoryRouter initialEntries={["/server/srv-1/console"]}>
        <ServerRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("conflict-state")).toBeDefined();
    expect(screen.queryByTestId("navigation-router")).toBeNull();
  });

  it("renders admin direct link when user is rootAdmin", () => {
    mockRootAdmin = true;
    mockServerState.data = {
      id: "srv-1",
      uuid: "uuid-1",
      internalId: 42,
    };

    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <ServerRouter />
      </MemoryRouter>,
    );

    const adminLink = screen.getByRole("link");
    expect(adminLink.getAttribute("href")).toBe("/admin/servers/view/42");
  });

  it("allows rootAdmin to access root server url during conflict state", () => {
    mockRootAdmin = true;
    mockServerState.data = {
      id: "srv-1",
      uuid: "uuid-1",
      internalId: 42,
    };
    mockServerState.inConflictState = true;

    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <ServerRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("navigation-router")).toBeDefined();
    expect(screen.queryByTestId("conflict-state")).toBeNull();
  });

  it("shows conflict state to rootAdmin when on subpath during conflict state", () => {
    mockRootAdmin = true;
    mockServerState.data = {
      id: "srv-1",
      uuid: "uuid-1",
      internalId: 42,
    };
    mockServerState.inConflictState = true;

    render(
      <MemoryRouter initialEntries={["/server/srv-1/files"]}>
        <ServerRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("conflict-state")).toBeDefined();
    expect(screen.queryByTestId("navigation-router")).toBeNull();
  });
});
