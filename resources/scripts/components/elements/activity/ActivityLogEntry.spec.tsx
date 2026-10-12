import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ActivityLogEntry from "./ActivityLogEntry";
import { ActivityLog } from "@definitions/user";
import { MemoryRouter } from "react-router";

vi.mock("@/components/elements/tooltip/Tooltip", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/Translate", () => ({
  default: ({ defaults, values }: any) => (
    <span data-testid="translate">
      {defaults} - {JSON.stringify(values)}
    </span>
  ),
}));

vi.mock("@/components/Avatar", () => ({
  default: ({ src, alt }: any) => (
    <img src={src} alt={alt} data-testid="avatar" />
  ),
}));

vi.mock("@/components/elements/activity/ActivityLogMetaButton", () => ({
  default: () => <button data-testid="meta-button">Meta</button>,
}));

let mockCurrentUser = {
  uuid: "user-1",
  username: "admin",
  avatarUrl: "https://example.com/admin.png",
};

vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: { data: mockCurrentUser },
      settings: { data: { features: { privacyMode: true } } },
    }),
}));

const mockActivity: ActivityLog = {
  id: "act-1",
  batch: null,
  event: "server:power.start",
  isApi: false,
  ip: "127.0.0.1",
  description: "Server started",
  properties: {
    server: "Minecraft",
    file_count: 5,
    token: "secret_value",
    files: ["a.txt", "b.txt"],
  },
  hasAdditionalMetadata: true,
  timestamp: new Date("2026-01-01T12:00:00Z"),
  relationships: {
    actor: {
      id: 1,
      uuid: "user-1",
      username: "admin",
      email: "admin@test.com",
      avatarUrl: "https://example.com/actor.png",
    } as any,
  },
};

describe("components/elements/activity/ActivityLogEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (
    activity = mockActivity,
    children?: React.ReactNode,
  ) =>
    render(
      <MemoryRouter>
        <ActivityLogEntry activity={activity}>{children}</ActivityLogEntry>
      </MemoryRouter>,
    );

  it("renders entry details, avatar and formatted properties", () => {
    renderComponent();

    expect(screen.getByText("admin")).toBeDefined();
    expect(screen.getByTestId("meta-button")).toBeDefined();
    expect(screen.getByTestId("avatar")).toBeDefined();
    expect(screen.getByText("127.0.0.1")).toBeDefined();
  });

  it("renders SFTP icon for sftp events", () => {
    const sftpActivity = {
      ...mockActivity,
      event: "server:sftp.write",
      isApi: true,
    };
    renderComponent(sftpActivity);

    expect(screen.getByLabelText("API activity")).toBeDefined();
    expect(screen.getByLabelText("SFTP activity")).toBeDefined();
  });

  it("handles system actor when actor relationship is null", () => {
    const systemActivity = {
      ...mockActivity,
      relationships: { actor: null },
      ip: null,
      hasAdditionalMetadata: false,
    };
    renderComponent(systemActivity);

    expect(screen.getByText("System")).toBeDefined();
    expect(screen.queryByTestId("meta-button")).toBeNull();
  });

  it("renders custom children inside icons container", () => {
    renderComponent(
      mockActivity,
      <span data-testid="custom-child">Child</span>,
    );

    expect(screen.getByTestId("custom-child")).toBeDefined();
  });
});
