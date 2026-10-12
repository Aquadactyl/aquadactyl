import { act, render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
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

let websocketCallback: ((data: string) => void) | null = null;
vi.mock("@/plugins/useWebsocketEvent", () => ({
  default: (_event: any, callback: any) => {
    websocketCallback = callback;
  },
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
    websocketCallback = null;
  });

  it("renders backup details, size, and checksum for completed backup", () => {
    render(
      <Wrapper>
        <BackupRow backup={successfulBackup} />
      </Wrapper>,
    );

    expect(screen.getByText("Daily World Backup")).toBeDefined();
    expect(screen.getByText(/1.*B/)).toBeDefined();
    expect(screen.getByText("sha256:abcdef123456")).toBeDefined();
    expect(screen.getByTestId("backup-context-menu")).toBeDefined();
  });

  it("renders locked icon when backup is locked", () => {
    const lockedBackup: ServerBackup = {
      ...successfulBackup,
      isLocked: true,
    };

    const { container } = render(
      <Wrapper>
        <BackupRow backup={lockedBackup} />
      </Wrapper>,
    );

    const lockIcon = container.querySelector(".text-yellow-500");
    expect(lockIcon).toBeDefined();
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

  it("updates backup state on websocket BACKUP_COMPLETED event", () => {
    render(
      <Wrapper>
        <BackupRow backup={successfulBackup} />
      </Wrapper>,
    );

    expect(websocketCallback).not.toBeNull();

    act(() => {
      websocketCallback!(
        JSON.stringify({
          is_successful: true,
          checksum_type: "sha256",
          checksum: "newchecksum123",
          file_size: 2097152,
        }),
      );
    });

    expect(mockMutate).toHaveBeenCalled();
    const mutateCallback = mockMutate.mock.calls[0][0];
    const initialData = {
      items: [successfulBackup, { ...successfulBackup, uuid: "other-uuid" }],
    };
    const updated = mutateCallback(initialData);
    expect(updated.items[0].checksum).toBe("sha256:newchecksum123");
    expect(updated.items[0].bytes).toBe(2097152);
    expect(updated.items[1].checksum).toBe("sha256:abcdef123456");
  });

  it("handles invalid json in websocket event gracefully", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <Wrapper>
        <BackupRow backup={successfulBackup} />
      </Wrapper>,
    );

    act(() => {
      websocketCallback!("invalid-json{");
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("handles websocket event with fallback values when payload fields are missing", () => {
    render(
      <Wrapper>
        <BackupRow backup={successfulBackup} />
      </Wrapper>,
    );

    act(() => {
      websocketCallback!(JSON.stringify({}));
    });

    expect(mockMutate).toHaveBeenCalled();
    const mutateCallback = mockMutate.mock.calls[0][0];
    const initialData = { items: [successfulBackup] };
    const updated = mutateCallback(initialData);
    expect(updated.items[0].isSuccessful).toBe(true);
    expect(updated.items[0].checksum).toBe(":");
    expect(updated.items[0].bytes).toBe(0);
  });
});
