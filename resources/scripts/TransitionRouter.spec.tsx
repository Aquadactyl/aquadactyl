import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import TransitionRouter from "./TransitionRouter";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => (
      <div data-testid="transition-container" {...props}>
        {children}
      </div>
    ),
  },
}));

describe("TransitionRouter", () => {
  it("renders with default routeLocation from context", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?tab=1"]}>
        <TransitionRouter>
          <span>Dashboard View</span>
        </TransitionRouter>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard View")).toBeTruthy();
    expect(screen.getByTestId("transition-container")).toBeTruthy();
  });

  it("renders with explicit prop location", () => {
    const customLocation = {
      pathname: "/custom",
      search: "?page=2",
      state: null,
      key: "custom-key",
      hash: "",
    };

    render(
      <MemoryRouter>
        <TransitionRouter location={customLocation as any}>
          <span>Custom View</span>
        </TransitionRouter>
      </MemoryRouter>,
    );

    expect(screen.getByText("Custom View")).toBeTruthy();
  });
});
