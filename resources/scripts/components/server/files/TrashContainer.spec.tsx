import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import TrashContainer from "./TrashContainer";
import {
  getTrash,
  restoreTrashItem,
  deleteTrashItem,
  TrashItem,
  TrashPage,
} from "@/api/server/files/trash";

let mockServerId = "srv-1";
let mockServerUuid = "uuid-1";

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: {
            id: mockServerId,
            uuid: mockServerUuid,
          },
        },
      }),
  },
}));

let mockFileTrashEnabled = true;

vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      settings: {
        data: {
          features: {
            fileTrash: mockFileTrashEnabled,
          },
        },
      },
    }),
}));

let mockLanguage = "en-US";
let mockResolvedLanguage: string | undefined = "en-US";

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({
    t: (_key: string, fallback: string, values: Record<string, unknown> = {}) =>
      fallback.replace(/\{\{(\w+)\}\}/g, (_match, key) =>
        String(values[key] ?? ""),
      ),
    i18n: {
      get language() {
        return mockLanguage;
      },
      get resolvedLanguage() {
        return mockResolvedLanguage;
      },
    },
  }),
}));

const mockClearFlashes = vi.fn();
const mockClearAndAddHttpError = vi.fn();

vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearFlashes: mockClearFlashes,
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/ServerContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div data-testid="server-content-block" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: ({ centered }: any) => (
    <div data-testid="spinner" data-centered={String(centered)} />
  ),
}));

vi.mock("@/api/http", () => ({
  httpErrorToHuman: (error: any) => error?.message || "An error occurred",
}));

let mockQueryData: TrashPage | null = null;
let mockQueryError: any = null;
let mockIsLoading = false;
let mockIsValidating = false;
let capturedQueryKey: any = null;
let capturedQueryFn: any = null;
const mockMutate = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: (...args: any[]) => mockInvalidateQueries(...args),
  },
  useTanStackQuery: (key: any, fn: any) => {
    capturedQueryKey = key;
    capturedQueryFn = fn;
    return {
      data: mockQueryData,
      error: mockQueryError,
      isLoading: mockIsLoading,
      isValidating: mockIsValidating,
      mutate: mockMutate,
    };
  },
}));

vi.mock("@/api/server/files/trash", () => ({
  getTrash: vi.fn(),
  restoreTrashItem: vi.fn(),
  deleteTrashItem: vi.fn(),
}));

vi.mock("@/components/elements/dialog", () => {
  const DialogComponent = ({ open, onClose, title, children }: any) =>
    open ? (
      <div data-testid="dialog" role="dialog">
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="Close dialog">
          Close
        </button>
        {children}
      </div>
    ) : null;
  DialogComponent.Footer = ({ children }: any) => (
    <div data-testid="dialog-footer">{children}</div>
  );
  return { Dialog: DialogComponent };
});

vi.mock("@/components/elements/button/index", () => {
  const MockBtn = ({ onClick, children, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      data-disabled={disabled ? "true" : undefined}
      {...props}
    >
      {children}
    </button>
  );
  MockBtn.Text = MockBtn;
  MockBtn.Danger = MockBtn;
  return { Button: MockBtn };
});

describe("components/server/files/TrashContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServerId = "srv-1";
    mockServerUuid = "uuid-1";
    mockFileTrashEnabled = true;
    mockLanguage = "en-US";
    mockResolvedLanguage = "en-US";
    mockQueryData = null;
    mockQueryError = null;
    mockIsLoading = false;
    mockIsValidating = false;
    mockMutate.mockResolvedValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <TrashContainer />
      </MemoryRouter>,
    );

  it("renders unavailable message and back link when file trash is disabled", () => {
    mockFileTrashEnabled = false;
    renderComponent();

    expect(screen.getByText("This page is unavailable.")).toBeDefined();
    const link = screen.getByRole("link", { name: "Back to files" });
    expect(link.getAttribute("href")).toBe("/server/srv-1/files");
    expect(capturedQueryKey).toBeNull();
  });

  it("shows loading spinner when data is loading", () => {
    mockIsLoading = true;
    renderComponent();

    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(screen.getByText("Loading trash…")).toBeDefined();
  });

  it("shows error alert and handles retry button click", () => {
    mockQueryError = new Error("Failed to load trash");
    renderComponent();

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Failed to load trash")).toBeDefined();

    const retryButton = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryButton);
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when data is empty", () => {
    mockQueryData = {
      data: [],
      meta: { current_page: 1, last_page: 1, total: 0 },
    };
    renderComponent();

    expect(screen.getByText("Your server trash is empty.")).toBeDefined();
    expect(
      screen.getByText("Files and folders you move to trash will appear here."),
    ).toBeDefined();
  });

  it("renders items with different statuses and icons, using fallback language", () => {
    mockResolvedLanguage = undefined;
    mockLanguage = "fr-FR";

    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const pastDate = new Date(Date.now() - 86400000).toISOString();

    const items: TrashItem[] = [
      {
        id: "item-1",
        name: "test-file.txt",
        path: "/test-file.txt",
        is_file: true,
        ready: true,
        deleted_at: pastDate,
        expires_at: futureDate,
      },
      {
        id: "item-2",
        name: "test-folder",
        path: "/test-folder",
        is_file: false,
        ready: false,
        deleted_at: pastDate,
        expires_at: futureDate,
      },
      {
        id: "item-3",
        name: "expired-file.txt",
        path: "/expired-file.txt",
        is_file: true,
        ready: true,
        deleted_at: pastDate,
        expires_at: pastDate,
      },
    ];

    mockQueryData = {
      data: items,
      meta: { current_page: 1, last_page: 1, total: 3 },
    };

    renderComponent();

    expect(screen.getByText("Deleted items")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined(); // total count badge

    // item-1: file, ready, not expired
    expect(screen.getByText("test-file.txt")).toBeDefined();
    expect(screen.getByText("Recoverable")).toBeDefined();

    // item-2: folder, not ready
    expect(screen.getByText("test-folder")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
    expect(
      screen.getByText(
        "Move pending confirmation. Refresh or retry when Wings is available.",
      ),
    ).toBeDefined();

    // item-3: expired
    expect(screen.getByText("expired-file.txt")).toBeDefined();
    expect(screen.getByText("Expired")).toBeDefined();
  });

  it("invokes queryFn and calls getTrash with current page", async () => {
    mockQueryData = {
      data: [],
      meta: { current_page: 1, last_page: 1, total: 0 },
    };
    renderComponent();

    expect(capturedQueryFn).toBeDefined();
    vi.mocked(getTrash).mockResolvedValueOnce(mockQueryData);
    await capturedQueryFn();
    expect(getTrash).toHaveBeenCalledWith("uuid-1", 1);
  });

  it("handles refresh button in toolbar and spins when isValidating is true", () => {
    mockIsValidating = true;
    mockQueryData = {
      data: [],
      meta: { current_page: 1, last_page: 1, total: 0 },
    };

    const { rerender } = renderComponent();

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    expect(refreshButton.getAttribute("data-disabled")).toBe("true");

    mockIsValidating = false;
    rerender(
      <MemoryRouter>
        <TrashContainer />
      </MemoryRouter>,
    );

    const activeRefresh = screen.getByRole("button", { name: /Refresh/i });
    expect(activeRefresh.getAttribute("data-disabled")).toBeNull();
    fireEvent.click(activeRefresh);
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("restores item successfully, invalidates files cache and updates list", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const item: TrashItem = {
      id: "item-1",
      name: "restore-me.txt",
      path: "/restore-me.txt",
      is_file: true,
      ready: true,
      deleted_at: futureDate,
      expires_at: futureDate,
    };

    mockQueryData = {
      data: [item],
      meta: { current_page: 1, last_page: 1, total: 1 },
    };

    let resolveRestore: () => void = () => {};
    vi.mocked(restoreTrashItem).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRestore = resolve;
        }),
    );

    renderComponent();

    const restoreBtn = screen.getByRole("button", { name: /Restore/i });
    fireEvent.click(restoreBtn);

    // busy is set: button shows loading spinner or disabled
    expect(restoreBtn.getAttribute("data-disabled")).toBe("true");

    // Attempting to trigger operate while busy should return early
    fireEvent.click(restoreBtn);

    // Resolve restore operation
    resolveRestore();

    await waitFor(() => {
      expect(restoreTrashItem).toHaveBeenCalledWith("uuid-1", "item-1");
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["uuid-1", "files"],
      });
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("handles restore failure and displays flash error", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const item: TrashItem = {
      id: "item-1",
      name: "restore-fail.txt",
      path: "/restore-fail.txt",
      is_file: true,
      ready: true,
      deleted_at: futureDate,
      expires_at: futureDate,
    };

    mockQueryData = {
      data: [item],
      meta: { current_page: 1, last_page: 1, total: 1 },
    };

    const error = new Error("Restore failed");
    vi.mocked(restoreTrashItem).mockRejectedValueOnce(error);

    renderComponent();

    const restoreBtn = screen.getByRole("button", { name: /Restore/i });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith({
        key: "trash",
        error,
      });
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("opens delete dialog, confirms permanent deletion and adjusts page if last item on page", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const item: TrashItem = {
      id: "item-del",
      name: "delete-me.txt",
      path: "/delete-me.txt",
      is_file: true,
      ready: true,
      deleted_at: futureDate,
      expires_at: futureDate,
    };

    mockQueryData = {
      data: [item],
      meta: { current_page: 2, last_page: 2, total: 2 },
    };

    vi.mocked(deleteTrashItem).mockResolvedValueOnce(undefined);
    mockMutate.mockResolvedValueOnce({
      data: [],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });

    renderComponent();

    // First go to page 2 via next button
    const nextBtn = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(nextBtn);

    // Open delete dialog
    const deleteIconButton = screen.getByTitle("Permanently delete");
    fireEvent.click(deleteIconButton);

    expect(screen.getByTestId("dialog")).toBeDefined();
    expect(
      screen.getByText(
        "Permanently delete delete-me.txt? This cannot be undone.",
      ),
    ).toBeDefined();

    // Close dialog via Dialog's onClose prop
    const closeDialogBtn = screen.getByRole("button", { name: "Close dialog" });
    fireEvent.click(closeDialogBtn);
    expect(screen.queryByTestId("dialog")).toBeNull();

    // Open again and cancel dialog via Cancel button
    fireEvent.click(deleteIconButton);
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(screen.queryByTestId("dialog")).toBeNull();

    // Open again and confirm
    fireEvent.click(deleteIconButton);
    const confirmDeleteBtn = screen.getAllByRole("button", {
      name: "Permanently delete",
    })[1];
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteTrashItem).toHaveBeenCalledWith("uuid-1", "item-del");
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["uuid-1", "files"],
      });
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("handles permanent delete failure and reports http error", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const item: TrashItem = {
      id: "item-fail",
      name: "delete-fail.txt",
      path: "/delete-fail.txt",
      is_file: true,
      ready: true,
      deleted_at: futureDate,
      expires_at: futureDate,
    };

    mockQueryData = {
      data: [item],
      meta: { current_page: 1, last_page: 1, total: 1 },
    };

    const error = new Error("Delete failed");
    vi.mocked(deleteTrashItem).mockRejectedValueOnce(error);

    renderComponent();

    fireEvent.click(screen.getByTitle("Permanently delete"));

    const confirmDeleteBtn = screen.getAllByRole("button", {
      name: "Permanently delete",
    })[1];
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith({
        key: "trash",
        error,
      });
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("handles pagination navigation (Previous and Next)", () => {
    mockQueryData = {
      data: [
        {
          id: "item-1",
          name: "page-item.txt",
          path: "/page-item.txt",
          is_file: true,
          ready: true,
          deleted_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      ],
      meta: { current_page: 1, last_page: 3, total: 3 },
    };

    renderComponent();

    expect(screen.getByText("Page 1 of 3")).toBeDefined();

    const prevBtn = screen.getByRole("button", { name: /Previous/i });
    const nextBtn = screen.getByRole("button", { name: /Next/i });

    expect(prevBtn.getAttribute("data-disabled")).toBe("true");
    expect(nextBtn.getAttribute("data-disabled")).toBeNull();

    // Click next -> page 2
    fireEvent.click(nextBtn);
    expect(screen.getByText("Page 2 of 3")).toBeDefined();
    expect(prevBtn.getAttribute("data-disabled")).toBeNull();
    expect(nextBtn.getAttribute("data-disabled")).toBeNull();

    // Click next -> page 3
    fireEvent.click(nextBtn);
    expect(screen.getByText("Page 3 of 3")).toBeDefined();
    expect(nextBtn.getAttribute("data-disabled")).toBe("true");

    // Click previous -> page 2
    fireEvent.click(prevBtn);
    expect(screen.getByText("Page 2 of 3")).toBeDefined();
  });
});
