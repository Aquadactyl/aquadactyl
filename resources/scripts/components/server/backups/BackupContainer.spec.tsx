import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BackupContainer from "./BackupContainer";

let mockBackupsData: any = null;
let mockError: any = null;
let mockIsValidating = false;

vi.mock("@/api/server/backups/getServerBackups", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    default: () => ({
      data: mockBackupsData,
      error: mockError,
      isValidating: mockIsValidating,
    }),
  };
});

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <span data-testid="spinner" />,
}));

vi.mock("@/components/elements/Pagination", () => ({
  default: ({ data, onPageSelect, children }: any) => (
    <div>
      <button data-testid="next-page" onClick={() => onPageSelect(2)}>
        Next Page
      </button>
      {children({ items: data.items })}
    </div>
  ),
}));

vi.mock("@/components/server/backups/BackupRow", () => ({
  default: ({ backup }: any) => (
    <div data-testid="backup-row">{backup.name}</div>
  ),
}));

vi.mock("@/components/server/backups/CreateBackupButton", () => ({
  default: () => <button>Create Backup Mock</button>,
}));

vi.mock("@/components/elements/ServerContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/FlashMessageRender", () => ({
  default: () => null,
}));

vi.mock("@blueprint/components/Server/Backups/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Backups/AfterContent", () => ({
  default: () => null,
}));

let mockBackupLimit = 3;
vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: {
            uuid: "srv-uuid-1",
            featureLimits: { backups: mockBackupLimit },
          },
        },
      }),
  },
}));

const mockClearFlashes = vi.fn();
const mockClearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearFlashes: mockClearFlashes,
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

describe("components/server/backups/BackupContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBackupLimit = 3;
    mockError = null;
    mockIsValidating = false;
    mockBackupsData = {
      items: [{ uuid: "b-1", name: "Daily Backup" }],
      pagination: {
        total: 1,
        count: 1,
        perPage: 10,
        currentPage: 1,
        totalPages: 1,
      },
      backupCount: 1,
    };
  });

  it("renders backup rows and limit counts", () => {
    render(<BackupContainer />);

    expect(screen.getByText("Daily Backup")).toBeDefined();
    expect(
      screen.getByText(/1 of 3 backups have been created for this server/),
    ).toBeDefined();
    expect(screen.getByText("Create Backup Mock")).toBeDefined();
  });

  it("shows spinner while loading backups", () => {
    mockBackupsData = null;
    render(<BackupContainer />);

    expect(screen.getByTestId("spinner")).toBeDefined();
  });

  it("displays empty state message when no backups exist and limit > 0", () => {
    mockBackupsData = {
      items: [],
      pagination: {
        total: 0,
        count: 0,
        perPage: 10,
        currentPage: 1,
        totalPages: 0,
      },
      backupCount: 0,
    };

    render(<BackupContainer />);

    expect(
      screen.getByText(
        "It looks like there are no backups currently stored for this server.",
      ),
    ).toBeDefined();
  });

  it("displays limit 0 notice when backupLimit is 0", () => {
    mockBackupLimit = 0;
    mockBackupsData = {
      items: [],
      pagination: {
        total: 0,
        count: 0,
        perPage: 10,
        currentPage: 1,
        totalPages: 0,
      },
      backupCount: 0,
    };

    render(<BackupContainer />);

    expect(
      screen.getByText(
        /Backups cannot be created for this server because the backup limit is set to 0/i,
      ),
    ).toBeDefined();
  });

  it("adds flash error when fetch fails", () => {
    mockError = new Error("Failed to load backups");
    render(<BackupContainer />);

    expect(mockClearAndAddHttpError).toHaveBeenCalledWith(
      expect.objectContaining({ error: mockError, key: "backups" }),
    );
  });

  it("renders multiple backup rows with spacing", () => {
    mockBackupsData = {
      items: [
        { uuid: "b-1", name: "Backup 1" },
        { uuid: "b-2", name: "Backup 2" },
      ],
      pagination: {
        total: 2,
        count: 2,
        perPage: 10,
        currentPage: 1,
        totalPages: 1,
      },
      backupCount: 2,
    };

    render(<BackupContainer />);
    expect(screen.getByText("Backup 1")).toBeDefined();
    expect(screen.getByText("Backup 2")).toBeDefined();
  });

  it("shows out of backups message when page > 1 and items is empty", () => {
    mockBackupsData = {
      items: [],
      pagination: {
        total: 0,
        count: 0,
        perPage: 10,
        currentPage: 1,
        totalPages: 2,
      },
      backupCount: 1,
    };

    render(<BackupContainer />);
    fireEvent.click(screen.getByTestId("next-page"));

    expect(
      screen.getByText(
        "Looks like we've run out of backups to show you, try going back a page.",
      ),
    ).toBeDefined();
  });

  it("does not render create backup button when backupLimit equals backupCount", () => {
    mockBackupLimit = 2;
    mockBackupsData = {
      items: [
        { uuid: "b-1", name: "Backup 1" },
        { uuid: "b-2", name: "Backup 2" },
      ],
      pagination: {
        total: 2,
        count: 2,
        perPage: 10,
        currentPage: 1,
        totalPages: 1,
      },
      backupCount: 2,
    };

    render(<BackupContainer />);
    expect(screen.queryByText("Create Backup Mock")).toBeNull();
  });
});
