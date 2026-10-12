import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import CreateBackupButton from "./CreateBackupButton";
import createServerBackup from "@/api/server/backups/createServerBackup";

const mockMutate = vi.fn();
const mockClearFlashes = vi.fn();
const mockClearAndAddHttpError = vi.fn();

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: { uuid: "server-uuid-123" },
        },
      }),
  },
}));

vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearFlashes: mockClearFlashes,
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

vi.mock("@/api/server/backups/getServerBackups", () => ({
  default: () => ({
    mutate: mockMutate,
  }),
}));

vi.mock("@/api/server/backups/createServerBackup");

vi.mock("@/components/elements/Modal", () => ({
  default: ({ visible, onDismissed, children }: any) =>
    visible ? (
      <div data-testid="backup-modal">
        <button data-testid="dismiss-modal-btn" onClick={onDismissed}>
          Dismiss
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/FlashMessageRender", () => ({
  default: () => null,
}));

describe("components/server/backups/CreateBackupButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens modal and submits backup form successfully", async () => {
    const createdBackup = {
      uuid: "new-backup-uuid",
      name: "Manual Backup",
      isSuccessful: true,
      createdAt: new Date(),
    };
    vi.mocked(createServerBackup).mockResolvedValueOnce(createdBackup as any);

    render(<CreateBackupButton className="custom-backup-btn" />);

    const openBtn = screen.getByRole("button", { name: "Create backup" });
    fireEvent.click(openBtn);

    expect(screen.getByTestId("backup-modal")).toBeTruthy();
    expect(screen.getByText("Create server backup")).toBeTruthy();

    const nameInput = screen.getByLabelText("Backup name");
    const ignoredInput = screen.getByLabelText("Ignored Files & Directories");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Manual Backup" } });
      fireEvent.change(ignoredInput, {
        target: { value: "node_modules\n.git" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Start backup" }));
    });

    await waitFor(() => {
      expect(createServerBackup).toHaveBeenCalledWith("server-uuid-123", {
        name: "Manual Backup",
        ignored: "node_modules\n.git",
        isLocked: false,
      });
    });

    expect(mockMutate).toHaveBeenCalled();
    const updater = mockMutate.mock.calls[0][0];
    const initialData = { items: [], backupCount: 0 };
    expect(updater(initialData)).toEqual({
      items: [createdBackup],
      backupCount: 1,
    });
  });

  it("handles backup creation error", async () => {
    const error = new Error("Failed to create backup");
    vi.mocked(createServerBackup).mockRejectedValueOnce(error);

    render(<CreateBackupButton />);

    const openBtn = screen.getByRole("button", { name: "Create backup" });
    fireEvent.click(openBtn);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start backup" }));
    });

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith({
        key: "backups:create",
        error,
      });
    });
  });

  it("closes modal on dismissal", () => {
    render(<CreateBackupButton />);
    const openBtn = screen.getByRole("button", { name: "Create backup" });
    fireEvent.click(openBtn);
    expect(screen.getByTestId("backup-modal")).toBeTruthy();

    fireEvent.click(screen.getByTestId("dismiss-modal-btn"));
    expect(screen.queryByTestId("backup-modal")).toBeNull();
  });
});
