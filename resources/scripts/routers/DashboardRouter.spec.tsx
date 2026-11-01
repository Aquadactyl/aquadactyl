import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import DashboardRouter from "./DashboardRouter";

vi.mock("@/components/NavigationBar", () => ({
  default: () => <nav data-testid="nav-bar">NavigationBar</nav>,
}));

vi.mock("@/components/elements/SubNavigation", () => ({
  default: ({ children, id }: any) => (
    <div id={id} data-testid="sub-navigation">
      {children}
    </div>
  ),
}));

vi.mock("@blueprint/extends/routers/DashboardRouter", () => ({
  NavigationLinks: () => <span data-testid="blueprint-links">NavLinks</span>,
  NavigationRouter: () => (
    <main data-testid="navigation-router">RouterOutlet</main>
  ),
}));

vi.mock(
  "@blueprint/components/Navigation/SubNavigation/BeforeSubNavigation",
  () => ({
    default: () => <div>BeforeSubNav</div>,
  }),
);
vi.mock(
  "@blueprint/components/Navigation/SubNavigation/AdditionalAccountItems",
  () => ({
    default: () => <div>AdditionalItems</div>,
  }),
);
vi.mock(
  "@blueprint/components/Navigation/SubNavigation/AfterSubNavigation",
  () => ({
    default: () => <div>AfterSubNav</div>,
  }),
);

describe("routers/DashboardRouter", () => {
  it("renders NavigationBar and NavigationRouter without SubNavigation on root path", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <DashboardRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("nav-bar")).toBeTruthy();
    expect(screen.getByTestId("navigation-router")).toBeTruthy();
    expect(screen.queryByTestId("sub-navigation")).toBeNull();
  });

  it("renders SubNavigation when path starts with /account", () => {
    render(
      <MemoryRouter initialEntries={["/account/security"]}>
        <DashboardRouter />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("nav-bar")).toBeTruthy();
    expect(screen.getByTestId("sub-navigation")).toBeTruthy();
    expect(screen.getByTestId("blueprint-links")).toBeTruthy();
    expect(screen.getByText("AdditionalItems")).toBeTruthy();
  });
});
