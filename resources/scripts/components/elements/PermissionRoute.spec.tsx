import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PermissionRoute from "./PermissionRoute";

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

describe("components/elements/PermissionRoute", () => {
  it("renders children without Can wrapper when permission is null", () => {
    render(
      <PermissionRoute permission={null}>
        <span>Public Route Content</span>
      </PermissionRoute>,
    );

    expect(screen.getByText("Public Route Content")).toBeTruthy();
    expect(screen.queryByTestId("allowed")).toBeNull();
  });

  it("renders children when permission is granted", () => {
    render(
      <PermissionRoute permission="websocket.connect">
        <span>Restricted Route Content</span>
      </PermissionRoute>,
    );

    expect(screen.getByText("Restricted Route Content")).toBeTruthy();
    expect(screen.getByTestId("allowed")).toBeTruthy();
  });

  it("renders access denied error when permission is denied", () => {
    render(
      <PermissionRoute permission="denied">
        <span>Restricted Route Content</span>
      </PermissionRoute>,
    );

    expect(screen.getByText("Access Denied")).toBeTruthy();
    expect(
      screen.getByText("You do not have permission to access this page."),
    ).toBeTruthy();
  });
});
