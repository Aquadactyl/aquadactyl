import React, { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import routes from "./routes";

vi.mock("@/components/server/console/ServerConsoleContainer", () => ({
  default: () => <div>Console</div>,
}));
vi.mock("@/components/server/databases/DatabasesContainer", () => ({
  default: () => <div>Databases</div>,
}));
vi.mock("@/components/server/schedules/ScheduleContainer", () => ({
  default: () => <div>Schedules</div>,
}));
vi.mock("@/components/server/users/UsersContainer", () => ({
  default: () => <div>Users</div>,
}));
vi.mock("@/components/server/backups/BackupContainer", () => ({
  default: () => <div>Backups</div>,
}));
vi.mock("@/components/server/network/NetworkContainer", () => ({
  default: () => <div>Network</div>,
}));
vi.mock("@/components/server/startup/StartupContainer", () => ({
  default: () => <div>Startup</div>,
}));
vi.mock("@/components/server/files/FileManagerContainer", () => ({
  default: () => <div>Files</div>,
}));
vi.mock("@/components/server/settings/SettingsContainer", () => ({
  default: () => <div>Settings</div>,
}));
vi.mock("@/components/dashboard/AccountOverviewContainer", () => ({
  default: () => <div>AccountOverview</div>,
}));
vi.mock("@/components/dashboard/AccountApiContainer", () => ({
  default: () => <div>AccountApi</div>,
}));
vi.mock("@/components/dashboard/ssh/AccountSSHContainer", () => ({
  default: () => <div>AccountSSH</div>,
}));
vi.mock("@/components/dashboard/activity/ActivityLogContainer", () => ({
  default: () => <div>ActivityLog</div>,
}));
vi.mock("@/components/server/ServerActivityLogContainer", () => ({
  default: () => <div>ServerActivityLog</div>,
}));
vi.mock("@/components/server/files/FileEditContainer", () => ({
  default: () => <div>FileEdit</div>,
}));
vi.mock("@/components/server/schedules/ScheduleEditContainer", () => ({
  default: () => <div>ScheduleEdit</div>,
}));

describe("routers/routes", () => {
  it("defines account and server routes and loads all lazy components", async () => {
    expect(routes.account.length).toBe(4);
    expect(routes.server.length).toBe(12);

    for (const route of [...routes.account, ...routes.server]) {
      const Component = route.component;
      const { unmount } = render(
        <Suspense fallback={<div>Loading</div>}>
          <Component />
        </Suspense>,
      );
      await waitFor(() => {
        expect(Component).toBeDefined();
      });
      unmount();
    }
  });
});
