import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import BackupContextMenu from "./BackupContextMenu";
import { ServerContext } from "@/state/server";
import { ServerBackup } from "@/api/server/types";
import getBackupDownloadUrl from "@/api/server/backups/getBackupDownloadUrl";
import deleteBackup from "@/api/server/backups/deleteBackup";
import getServerBackups from "@/api/server/backups/getServerBackups";
import { restoreServerBackup } from "@/api/server/backups";
import http from "@/api/http";

vi.mock("@/api/http");
vi.mock("@/api/server/backups/getBackupDownloadUrl");
vi.mock("@/api/server/backups/deleteBackup");
vi.mock("@/api/server/backups/getServerBackups");
vi.mock("@/api/server/backups", () => ({
  restoreServerBackup: vi.fn(),
}));

vi.mock("@blueprint/components/Server/Backups/DropdownItems", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/DropdownMenu", () => ({
  default: ({ children, renderToggle }: any) => {
    return (
      <div>
        {renderToggle(() => {})}
        <div data-testid="dropdown-content">{children}</div>
      </div>
    );
  },
  DropdownButtonRow: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/elements/dialog", () => ({
  Dialog: {
    Confirm: ({ open, title, confirm, onConfirmed, children, onClose }: any) =>
      open ? (
        <div data-testid="confirm-dialog">
          <h1>{title}</h1>
          {children}
          <button onClick={onConfirmed}>{confirm || "Confirm"}</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      ) : null,
  },
}));

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible }: any) =>
    visible ? <div data-testid="spinner-overlay" /> : null,
}));

const mockBackup: ServerBackup = {
  uuid: "backup-uuid-1",
  isSuccessful: true,
  isLocked: false,
  name: "My Backup",
  ignoredFiles: [],
  checksum: "sha256:abc",
  bytes: 10240,
  createdAt: new Date(),
  completedAt: new Date(),
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState(
    (s) => !!s.server.data && s.server.permissions.length > 0,
  );
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-uuid-1",
      name: "Test Server",
      node: "Node 1",
      isNodeUnderMaintenance: false,
      status: "running",
      invocation: "start",
      dockerImage: "java",
      sftpDetails: { ip: "127.0.0.1", port: 2022 },
      description: "",
      limits: {
        memory: 1024,
        swap: 0,
        disk: 1024,
        io: 500,
        cpu: 100,
        threads: "",
      },
      featureLimits: { databases: 1, allocations: 1, backups: 1 },
      isTransferring: false,
      eggFeatures: [],
      allocations: [],
      variables: [],
    });
    setPermissions(["*"]);
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/backups/BackupContextMenu", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerBackups).mockReturnValue({
      mutate: mockMutate,
    } as any);
  });

  it("renders backup menu items (Download, Restore, Lock, Delete)", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <BackupContextMenu backup={mockBackup} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("Download")).toBeDefined();
    expect(screen.getByText("Restore")).toBeDefined();
    expect(screen.getByText("Lock")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("handles backup download action", async () => {
    vi.mocked(getBackupDownloadUrl).mockResolvedValueOnce(
      "https://daemon.test/backup.tar.gz",
    );

    render(
      <ServerContext.Provider>
        <Wrapper>
          <BackupContextMenu backup={mockBackup} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const downloadBtn = await screen.findByText("Download");
    fireEvent.click(downloadBtn);
    await waitFor(() => {
      expect(getBackupDownloadUrl).toHaveBeenCalledWith(
        "server-uuid-1",
        "backup-uuid-1",
      );
    });
  });

  it("toggles lock for unlocked backup", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <BackupContextMenu backup={mockBackup} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const lockBtn = await screen.findByText("Lock");
    fireEvent.click(lockBtn);
    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1/backups/backup-uuid-1/lock",
      );
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("opens unlock confirmation for locked backup and unlocks on confirm", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    const lockedBackup = { ...mockBackup, isLocked: true };

    render(
      <ServerContext.Provider>
        <Wrapper>
          <BackupContextMenu backup={lockedBackup} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const unlockBtn = await screen.findByText("Unlock");
    fireEvent.click(unlockBtn);

    const dialog = screen.getByTestId("confirm-dialog");
    expect(dialog).toBeDefined();
    expect(
      screen.getByRole("heading", { name: 'Unlock "My Backup"' }),
    ).toBeDefined();

    const confirmBtn = within(dialog).getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1/backups/backup-uuid-1/lock",
      );
    });
  });

  it("opens restore confirmation dialog and triggers restoreServerBackup", async () => {
    vi.mocked(restoreServerBackup).mockResolvedValueOnce({} as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <BackupContextMenu backup={mockBackup} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const restoreBtn = await screen.findByText("Restore");
    fireEvent.click(restoreBtn);

    const dialog = screen.getByTestId("confirm-dialog");
    expect(dialog).toBeDefined();
    expect(
      screen.getByRole("heading", { name: 'Restore "My Backup"' }),
    ).toBeDefined();

    const confirmBtn = within(dialog).getByRole("button", { name: "Restore" });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(restoreServerBackup).toHaveBeenCalledWith(
        "server-uuid-1",
        "backup-uuid-1",
        false,
      );
    });
  });

  it("opens delete confirmation and executes deletion", async () => {
    vi.mocked(deleteBackup).mockResolvedValueOnce(undefined as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <BackupContextMenu backup={mockBackup} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteMenuBtn = await screen.findByText("Delete");
    fireEvent.click(deleteMenuBtn);

    const dialog = screen.getByTestId("confirm-dialog");
    expect(dialog).toBeDefined();
    expect(
      screen.getByRole("heading", { name: 'Delete "My Backup"' }),
    ).toBeDefined();

    const confirmBtn = within(dialog).getByRole("button", { name: "Continue" });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(deleteBackup).toHaveBeenCalledWith(
        "server-uuid-1",
        "backup-uuid-1",
      );
    });
  });
});
