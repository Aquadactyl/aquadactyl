import React, { lazy } from "react";

// Both routers share this registry. Keep screen imports lazy so reading the
// navigation does not download every account and server screen.
const ServerConsole = lazy(
  () => import("@/components/server/console/ServerConsoleContainer"),
);
const DatabasesContainer = lazy(
  () => import("@/components/server/databases/DatabasesContainer"),
);
const ScheduleContainer = lazy(
  () => import("@/components/server/schedules/ScheduleContainer"),
);
const UsersContainer = lazy(
  () => import("@/components/server/users/UsersContainer"),
);
const BackupContainer = lazy(
  () => import("@/components/server/backups/BackupContainer"),
);
const NetworkContainer = lazy(
  () => import("@/components/server/network/NetworkContainer"),
);
const StartupContainer = lazy(
  () => import("@/components/server/startup/StartupContainer"),
);
const FileManagerContainer = lazy(
  () => import("@/components/server/files/FileManagerContainer"),
);
const TrashContainer = lazy(
  () => import("@/components/server/files/TrashContainer"),
);
const SettingsContainer = lazy(
  () => import("@/components/server/settings/SettingsContainer"),
);
const AccountOverviewContainer = lazy(
  () => import("@/components/dashboard/AccountOverviewContainer"),
);
const AccountNotificationsContainer = lazy(
  () => import("@/components/dashboard/AccountNotificationsContainer"),
);
const AccountApiContainer = lazy(
  () => import("@/components/dashboard/AccountApiContainer"),
);
const AccountSSHContainer = lazy(
  () => import("@/components/dashboard/ssh/AccountSSHContainer"),
);
const ActivityLogContainer = lazy(
  () => import("@/components/dashboard/activity/ActivityLogContainer"),
);
const ServerActivityLogContainer = lazy(
  () => import("@/components/server/ServerActivityLogContainer"),
);
const FileEditContainer = lazy(
  () => import("@/components/server/files/FileEditContainer"),
);
const ScheduleEditContainer = lazy(
  () => import("@/components/server/schedules/ScheduleEditContainer"),
);

interface RouteDefinition {
  path: string;
  // If undefined is passed this route is still rendered into the router itself
  // but no navigation link is displayed in the sub-navigation menu.
  name: string | undefined;
  component: React.ComponentType;
  exact?: boolean;
}

interface ServerRouteDefinition extends RouteDefinition {
  permission: string | string[] | null;
}

interface Routes {
  // All of the routes available under "/account"
  account: RouteDefinition[];
  // All of the routes available under "/server/:id"
  server: ServerRouteDefinition[];
}

export default {
  account: [
    {
      path: "/",
      name: "Account",
      component: AccountOverviewContainer,
      exact: true,
    },
    {
      path: "/api",
      name: "API Credentials",
      component: AccountApiContainer,
    },
    {
      path: "/ssh",
      name: "SSH Keys",
      component: AccountSSHContainer,
    },
    {
      path: "/activity",
      name: "Activity",
      component: ActivityLogContainer,
    },
    {
      path: "/notifications",
      name: "Notifications",
      component: AccountNotificationsContainer,
    },
  ],
  server: [
    {
      path: "/",
      permission: null,
      name: "Console",
      component: ServerConsole,
      exact: true,
    },
    {
      path: "/files",
      permission: "file.*",
      name: "Files",
      component: FileManagerContainer,
    },
    {
      path: "/files/:action",
      permission: "file.*",
      name: undefined,
      component: FileEditContainer,
    },
    {
      path: "/trash",
      permission: "file.read",
      name: undefined,
      component: TrashContainer,
    },
    {
      path: "/databases",
      permission: "database.*",
      name: "Databases",
      component: DatabasesContainer,
    },
    {
      path: "/schedules",
      permission: "schedule.*",
      name: "Schedules",
      component: ScheduleContainer,
    },
    {
      path: "/schedules/:id",
      permission: "schedule.*",
      name: undefined,
      component: ScheduleEditContainer,
    },
    {
      path: "/users",
      permission: "user.*",
      name: "Users",
      component: UsersContainer,
    },
    {
      path: "/backups",
      permission: "backup.*",
      name: "Backups",
      component: BackupContainer,
    },
    {
      path: "/network",
      permission: "allocation.*",
      name: "Network",
      component: NetworkContainer,
    },
    {
      path: "/startup",
      permission: "startup.*",
      name: "Startup",
      component: StartupContainer,
    },
    {
      path: "/settings",
      permission: ["settings.*", "file.sftp"],
      name: "Settings",
      component: SettingsContainer,
    },
    {
      path: "/activity",
      permission: "activity.*",
      name: "Activity",
      component: ServerActivityLogContainer,
    },
  ],
} as Routes;
