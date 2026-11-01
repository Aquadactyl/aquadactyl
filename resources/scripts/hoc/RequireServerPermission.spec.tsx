import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RequireServerPermission from "./RequireServerPermission";

vi.mock("@/components/elements/Can", () => ({
  default: ({ action, renderOnError, children }: any) => {
    if (action === "denied") {
      return <div data-testid="error">{renderOnError}</div>;
    }
    return <div data-testid="allowed">{children}</div>;
  },
}));

vi.mock("@/components/elements/ScreenBlock", () => ({
  ServerError: ({ title, message }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  ),
}));

describe("hoc/RequireServerPermission", () => {
  it("renders children when permission is granted", () => {
    render(
      <RequireServerPermission permissions="file.read">
        <span>Protected Content</span>
      </RequireServerPermission>,
    );
    expect(screen.getByText("Protected Content")).toBeTruthy();
  });

  it("renders ServerError when permission is denied", () => {
    render(
      <RequireServerPermission permissions="denied">
        <span>Protected Content</span>
      </RequireServerPermission>,
    );
    expect(screen.getByText("Access Denied")).toBeTruthy();
    expect(
      screen.getByText("You do not have permission to access this page."),
    ).toBeTruthy();
  });
});
