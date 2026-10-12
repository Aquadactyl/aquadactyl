import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NavigationLinks, NavigationRouter } from "./ServerRouter";
import { MemoryRouter } from "react-router";
import http from "@/api/http";

vi.mock("@/api/http", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: ["1", "-1"] }),
  },
}));

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

vi.mock("@/components/elements/ScreenBlock", () => ({
  NotFound: () => <div data-testid="not-found">NotFound</div>,
  ServerError: () => <div data-testid="server-error">ServerError</div>,
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/Spinner", () => {
  const MockSpinner = () => <span data-testid="spinner" />;
  MockSpinner.Suspense = ({ children }: any) => <>{children}</>;
  return { default: MockSpinner };
});

vi.mock("@/components/elements/PermissionRoute", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/routers/routes", () => ({
  default: {
    server: [
      {
        path: "/",
        exact: true,
        name: "Console",
        component: () => <div>Console</div>,
      },
      {
        path: "/files",
        name: "Files",
        permission: "file.*",
        component: () => <div>Files</div>,
      },
      {
        path: "/hidden",
        name: undefined,
        component: () => <div>Hidden</div>,
      },
    ],
  },
}));

const defaultServerRoutes = [
  {
    path: "/ext-general",
    name: "Ext General",
    component: () => <div data-testid="ext-general">ExtGeneral</div>,
    adminOnly: false,
    identifier: "ext1",
    permission: null,
  },
  {
    path: "/ext-admin",
    name: "Ext Admin Badge",
    component: () => <div data-testid="ext-admin">ExtAdmin</div>,
    adminOnly: true,
    identifier: "ext2",
    permission: "admin.*",
  },
  {
    path: "/ext-admin-no-perm",
    name: "Ext Root Admin",
    component: () => <div>ExtRootAdmin</div>,
    adminOnly: true,
    identifier: "ext1",
    permission: null,
  },
  {
    path: "/ext-perm-not-admin",
    name: "Ext Perm Not Admin",
    component: () => <div>ExtPermNotAdmin</div>,
    adminOnly: false,
    identifier: "ext1",
    permission: "server.view",
  },
  {
    path: "/ext-unmatched-egg",
    name: "Ext Egg",
    component: () => <div data-testid="ext-egg">ExtEgg</div>,
    adminOnly: false,
    identifier: "ext3",
    permission: null,
  },
  {
    path: "/ext-no-name",
    name: undefined,
    component: () => <div>NoName</div>,
    adminOnly: false,
    identifier: "ext4",
    permission: null,
  },
];

let mockBlueprintServerRoutes = [...defaultServerRoutes];

vi.mock("./routes", () => ({
  default: {
    account: [],
    get server() {
      return mockBlueprintServerRoutes;
    },
  },
}));

let mockQueryData: any = {
  ext1: ["-1"],
  ext2: ["1"],
  ext3: ["999"],
  ext4: [],
};

vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: (_key: any, queryFn?: () => any) => {
    if (queryFn) {
      queryFn();
    }
    return { data: mockQueryData };
  },
}));

let mockRootAdmin = true;
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: { data: { rootAdmin: mockRootAdmin } },
      settings: { data: { blueprint: { disable_attribution: true } } },
    }),
}));

let mockServerEggId: any = 1;
vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: {
            id: "srv-1",
            BlueprintFramework: { eggId: mockServerEggId },
          },
        },
      }),
  },
}));

vi.mock("@/TransitionRouter", () => ({
  default: ({ children }: any) => (
    <div data-testid="transition-router">{children}</div>
  ),
}));

vi.mock("@blueprint/ui", () => ({
  UiBadge: ({ children }: any) => (
    <span data-testid="ui-badge">{children}</span>
  ),
}));

describe("blueprint/extends/routers/ServerRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRootAdmin = true;
    mockServerEggId = 1;
    mockQueryData = {
      ext1: ["-1"],
      ext2: ["1"],
      ext3: ["999"],
      ext4: [],
    };
  });

  it("renders navigation links for server tabs and blueprint tabs", () => {
    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <NavigationLinks />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Console/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Files/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Ext General/i })).toBeDefined();
    expect(
      screen.getByRole("link", { name: /Ext Admin Badge/i }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: /Ext Root Admin/i })).toBeDefined();
    expect(screen.queryByRole("link", { name: /Ext Egg/i })).toBeNull();
    expect(http.get).toHaveBeenCalledWith(
      "/api/client/extensions/blueprint/eggs",
      expect.any(Object),
    );
  });

  it("hides admin routes when user is not rootAdmin", () => {
    mockRootAdmin = false;
    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <NavigationLinks />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Ext General/i })).toBeDefined();
    expect(screen.queryByRole("link", { name: /Ext Admin Badge/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Ext Root Admin/i })).toBeNull();
  });

  it("handles fallback empty extension eggs when query returns null", () => {
    mockQueryData = null;
    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <NavigationLinks />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Console/i })).toBeDefined();
    // With empty eggs, ext1/ext2/ext3 won't match so no extension links rendered
    expect(screen.queryByRole("link", { name: /Ext General/i })).toBeNull();
  });

  it("renders router container and resolves blueprint child route", () => {
    render(
      <MemoryRouter initialEntries={["/ext-general"]}>
        <NavigationRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("transition-router")).toBeDefined();
    expect(screen.getByTestId("ext-general")).toBeDefined();
  });

  it("renders not found on unknown route in router container", () => {
    render(
      <MemoryRouter initialEntries={["/non-existent-subpath"]}>
        <NavigationRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("not-found")).toBeDefined();
  });

  it("handles empty blueprint server routes properly", () => {
    mockBlueprintServerRoutes = [];
    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <NavigationLinks />
        <NavigationRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText("Console")).toBeDefined();
    mockBlueprintServerRoutes = [...defaultServerRoutes];
  });
});
