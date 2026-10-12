import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NavigationLinks, NavigationRouter } from "./ServerRouter";
import { MemoryRouter } from "react-router";

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
      { path: "/files", name: "Files", component: () => <div>Files</div> },
    ],
  },
}));

vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: () => ({ data: {} }),
}));

vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: { data: { rootAdmin: true } },
      settings: { data: { blueprint: { disable_attribution: true } } },
    }),
}));

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: {
            id: "srv-1",
            BlueprintFramework: { eggId: 1 },
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
  });

  it("renders navigation links for server tabs", () => {
    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <NavigationLinks />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Console/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Files/i })).toBeDefined();
  });

  it("renders router container", () => {
    render(
      <MemoryRouter initialEntries={["/server/srv-1"]}>
        <NavigationRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("transition-router")).toBeDefined();
  });
});
