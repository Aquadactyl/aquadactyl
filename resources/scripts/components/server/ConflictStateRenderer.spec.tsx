import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ConflictStateRenderer from "./ConflictStateRenderer";

let mockServerState: any = {};

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({ server: { data: mockServerState } }),
  },
}));

vi.mock("@/components/elements/ScreenBlock", () => ({
  default: ({ title, message }: any) => (
    <div data-testid="screen-block">
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  ),
}));

describe("ConflictStateRenderer", () => {
  beforeEach(() => {
    mockServerState = {};
  });

  it("renders installing state", () => {
    mockServerState = { status: "installing" };
    render(<ConflictStateRenderer />);
    expect(screen.getByText("Running Installer")).toBeDefined();
    expect(screen.getByText(/Your server should be ready soon/i)).toBeDefined();
  });

  it("renders install_failed state", () => {
    mockServerState = { status: "install_failed" };
    render(<ConflictStateRenderer />);
    expect(screen.getByText("Running Installer")).toBeDefined();
  });

  it("renders reinstall_failed state", () => {
    mockServerState = { status: "reinstall_failed" };
    render(<ConflictStateRenderer />);
    expect(screen.getByText("Running Installer")).toBeDefined();
  });

  it("renders suspended state", () => {
    mockServerState = { status: "suspended" };
    render(<ConflictStateRenderer />);
    expect(screen.getByText("Server Suspended")).toBeDefined();
    expect(
      screen.getByText(/server is suspended and cannot be accessed/i),
    ).toBeDefined();
  });

  it("renders node maintenance state", () => {
    mockServerState = { status: null, isNodeUnderMaintenance: true };
    render(<ConflictStateRenderer />);
    expect(screen.getByText("Node under Maintenance")).toBeDefined();
  });

  it("renders transferring state", () => {
    mockServerState = { status: null, isTransferring: true };
    render(<ConflictStateRenderer />);
    expect(screen.getByText("Transferring")).toBeDefined();
    expect(screen.getByText(/transferred to a new node/i)).toBeDefined();
  });

  it("renders restoring from backup state when transferring is false and no other conflicts", () => {
    mockServerState = {
      status: null,
      isTransferring: false,
      isNodeUnderMaintenance: false,
    };
    render(<ConflictStateRenderer />);
    expect(screen.getByText("Restoring from Backup")).toBeDefined();
    expect(screen.getByText(/restored from a backup/i)).toBeDefined();
  });

  it("handles undefined server data gracefully", () => {
    mockServerState = null;
    render(<ConflictStateRenderer />);
    expect(screen.getByText("Restoring from Backup")).toBeDefined();
  });
});
