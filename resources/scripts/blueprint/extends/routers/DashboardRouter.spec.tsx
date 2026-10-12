import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NavigationLinks, NavigationRouter } from "./DashboardRouter";
import { MemoryRouter } from "react-router";

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_key: string, fallback?: string) => fallback || _key }),
}));

vi.mock("@/components/elements/ScreenBlock", () => ({
  NotFound: () => <div data-testid="not-found">NotFound</div>,
}));

vi.mock("@/components/dashboard/DashboardContainer", () => ({
  default: () => (
    <div data-testid="dashboard-container">DashboardContainer</div>
  ),
}));

vi.mock("@/components/elements/Spinner", () => {
  const MockSpinner = () => <span data-testid="spinner" />;
  return { default: MockSpinner };
});

vi.mock("@/routers/routes", () => ({
  default: {
    account: [
      {
        path: "/",
        exact: true,
        name: "Settings",
        component: () => <div>Settings Component</div>,
      },
      {
        path: "/api",
        name: "API Credentials",
        component: () => <div>API Component</div>,
      },
      {
        path: "/hidden",
        name: undefined,
        component: () => <div>Hidden Component</div>,
      },
    ],
  },
}));

let mockBlueprintAccountRoutes: any[] = [];
vi.mock("./routes", () => ({
  default: {
    get account() {
      return mockBlueprintAccountRoutes;
    },
  },
}));

let mockRootAdmin = false;
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: { data: { rootAdmin: mockRootAdmin } },
    }),
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

describe("blueprint/extends/routers/DashboardRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRootAdmin = false;
    mockBlueprintAccountRoutes = [];
  });

  it("renders navigation links for account tabs", () => {
    render(
      <MemoryRouter initialEntries={["/account"]}>
        <NavigationLinks />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Settings/i })).toBeDefined();
    expect(
      screen.getByRole("link", { name: /API Credentials/i }),
    ).toBeDefined();
    expect(screen.queryByRole("link", { name: /Hidden/i })).toBeNull();
  });

  it("renders blueprint extension routes for normal user and admin", () => {
    mockBlueprintAccountRoutes = [
      {
        path: "/ext-general",
        name: "Extension Tab",
        exact: true,
        adminOnly: false,
        component: () => <div>Extension General</div>,
      },
      {
        path: "/ext-admin",
        name: "Admin Extension",
        exact: false,
        adminOnly: true,
        component: () => <div>Extension Admin</div>,
      },
    ];

    const { rerender } = render(
      <MemoryRouter initialEntries={["/account"]}>
        <NavigationLinks />
      </MemoryRouter>,
    );

    expect(screen.getByText("Extension Tab")).toBeDefined();
    expect(screen.queryByText("Admin Extension")).toBeNull();

    mockRootAdmin = true;
    rerender(
      <MemoryRouter initialEntries={["/account"]}>
        <NavigationLinks />
      </MemoryRouter>,
    );

    expect(screen.getByText("Admin Extension")).toBeDefined();
    expect(screen.getByTestId("ui-badge")).toBeDefined();
  });

  it("renders navigation router with dashboard home route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavigationRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("dashboard-container")).toBeDefined();
  });

  it("renders aquadactyl account route", () => {
    render(
      <MemoryRouter initialEntries={["/account/api"]}>
        <NavigationRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText("API Component")).toBeDefined();
  });

  it("renders blueprint account route when matched", () => {
    mockRootAdmin = true;
    mockBlueprintAccountRoutes = [
      {
        path: "/custom",
        name: "Custom",
        adminOnly: true,
        component: () => <div>Blueprint Custom Component</div>,
      },
    ];

    render(
      <MemoryRouter initialEntries={["/account/custom"]}>
        <NavigationRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText("Blueprint Custom Component")).toBeDefined();
  });

  it("renders not found on unknown route", () => {
    render(
      <MemoryRouter initialEntries={["/non-existent-page"]}>
        <NavigationRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("not-found")).toBeDefined();
  });
});
