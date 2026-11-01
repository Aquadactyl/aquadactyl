import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import AuthenticatedRoute from "./AuthenticatedRoute";

let mockUser: any = null;

vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: {
        data: mockUser,
      },
    }),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    Navigate: ({ to, state }: any) => (
      <div
        data-testid="navigate"
        data-to={to}
        data-from={state?.from?.pathname}
      >
        Redirecting
      </div>
    ),
  };
});

describe("components/elements/AuthenticatedRoute", () => {
  it("renders children when authenticated", () => {
    mockUser = { uuid: "user-123" };
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthenticatedRoute>
          <span>Secret Page</span>
        </AuthenticatedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Secret Page")).toBeTruthy();
    expect(screen.queryByTestId("navigate")).toBeNull();
  });

  it("redirects to login when unauthenticated", () => {
    mockUser = null;
    render(
      <MemoryRouter initialEntries={["/servers/server-1"]}>
        <AuthenticatedRoute>
          <span>Secret Page</span>
        </AuthenticatedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Secret Page")).toBeNull();
    const nav = screen.getByTestId("navigate");
    expect(nav).toBeTruthy();
    expect(nav.getAttribute("data-to")).toBe("/auth/login");
    expect(nav.getAttribute("data-from")).toBe("/servers/server-1");
  });
});
