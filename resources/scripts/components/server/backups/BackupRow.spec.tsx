import { render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import BackupRow from "@/components/server/backups/BackupRow";
import { ServerContext } from "@/state/server";
import { ServerBackup } from "@/api/server/types";

const mockMutate = vi.fn();
vi.mock("@/api/server/backups/getServerBackups", () => ({
  default: () => ({
    mutate: mockMutate,
  }),
}));

vi.mock("@/components/server/backups/BackupContextMenu", () => ({
  default: () => <div data-testid={"backup-context-menu"}>Menu</div>,
}));

const successfulBackup: ServerBackup = {
  uuid: "backup-uuid-1",
  name: "Daily World Backup",
  ignoredFiles: "",
  bytes: 1048576,
  createdAt: new Date(),
  completedAt: new Date(),
  isSuccessful: true,
  isLocked: false,
  checksum: "sha256:abcdef123456",
};

const Inner = ({
  permissions = ["backup.download", "backup.restore", "backup.delete"],
  children,
}: {
  permissions?: string[];
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-backup-uuid",
    } as any);
    setPermissions(permissions);
  }, [setServer, setPermissions, permissions]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  permissions = ["backup.download", "backup.restore", "backup.delete"],
  children,
}: {
  permissions?: string[];
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner permissions={permissions}>{children}</Inner>
    </ServerContext.Provider>
  );
};

describe("BackupRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders backup details, size, and checksum for completed backup", () => {
    render(
      <Wrapper>
        <BackupRow backup={successfulBackup} />
      </Wrapper>,
    );

    expect(screen.getByText("Daily World Backup")).toBeDefined();
    // 1 MB
    expect(screen.getByText(/1.*B/)).toBeDefined();
    expect(screen.getByText("sha256:abcdef123456")).toBeDefined();
    expect(screen.getByTestId("backup-context-menu")).toBeDefined();
  });

  it("renders Failed badge when backup completed unsuccessfully", () => {
    const failedBackup: ServerBackup = {
      ...successfulBackup,
      isSuccessful: false,
    };

    render(
      <Wrapper>
        <BackupRow backup={failedBackup} />
      </Wrapper>,
    );

    expect(screen.getByText("Failed")).toBeDefined();
  });

  it("renders in-progress state when completedAt is null", () => {
    const inProgressBackup: ServerBackup = {
      ...successfulBackup,
      completedAt: null,
    };

    render(
      <Wrapper>
        <BackupRow backup={inProgressBackup} />
      </Wrapper>,
    );

    expect(screen.queryByTestId("backup-context-menu")).toBeNull();
  });
});
