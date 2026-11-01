import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FileManagerContainer from "./FileManagerContainer";
import { MemoryRouter } from "react-router";
import { FileObject } from "@/api/server/files/loadDirectory";

vi.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: (opts: any) => {
    opts?.estimateSize?.();
    return {
      options: { scrollMargin: undefined },
      getVirtualItems: () =>
        Array.from({ length: opts.count }, (_, index) => ({
          index,
          start: index * 41,
          size: 41,
          key: index,
        })),
      getTotalSize: () => opts.count * 41,
      measureElement: vi.fn(),
    };
  },
}));

vi.mock("@/components/elements/ScreenBlock", () => ({
  ServerError: ({ message, onRetry }: any) => (
    <div data-testid="server-error">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

let mockFiles: FileObject[] | null = null;
let mockError: any = null;
const mockMutate = vi.fn();

vi.mock("@/plugins/useFileManagerQuery", () => ({
  default: () => ({
    data: mockFiles,
    error: mockError,
    mutate: mockMutate,
  }),
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/Fade", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <span data-testid="spinner" />,
}));

vi.mock("@/components/elements/ServerContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/server/files/FileObjectRow", () => ({
  default: ({ file }: any) => <div data-testid="file-row">{file.name}</div>,
}));

vi.mock("@/components/server/files/FileManagerBreadcrumbs", () => ({
  default: ({ renderLeft }: any) => (
    <div data-testid="breadcrumbs">
      {renderLeft}
      <span>Breadcrumbs</span>
    </div>
  ),
}));

vi.mock("@/components/server/files/FileManagerStatus", () => ({
  default: () => null,
}));

vi.mock("@/components/server/files/MassActionsBar", () => ({
  default: () => <div data-testid="mass-actions" />,
}));

vi.mock("@/components/server/files/NewDirectoryButton", () => ({
  default: () => <button>New Directory</button>,
}));

vi.mock("@/components/server/files/UploadButton", () => ({
  default: () => <button>Upload</button>,
}));

vi.mock("@blueprint/components/Server/Files/Browse/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Files/Browse/FileButtons", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Files/Browse/AfterContent", () => ({
  default: () => null,
}));

const mockSetDirectory = vi.fn();
const mockSetSelectedFiles = vi.fn();
let mockSelectedFilesLength = 0;

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: { data: { id: "srv-1" } },
        files: {
          directory: "/",
          selectedFiles: { length: mockSelectedFilesLength },
        },
      }),
    useStoreActions: (selector: any) =>
      selector({
        files: {
          setDirectory: mockSetDirectory,
          setSelectedFiles: mockSetSelectedFiles,
        },
      }),
  },
}));

vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearFlashes: vi.fn(),
  }),
}));

let mockFileTrash = false;
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      settings: {
        data: {
          features: {
            fileTrash: mockFileTrash,
          },
        },
      },
    }),
}));

describe("components/server/files/FileManagerContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFiles = null;
    mockError = null;
    mockSelectedFilesLength = 0;
    mockFileTrash = false;
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={["/server/srv-1/files#"]}>
        <FileManagerContainer />
      </MemoryRouter>,
    );

  it("shows spinner when files are loading", () => {
    mockFiles = null;
    renderComponent();

    expect(screen.getByTestId("spinner")).toBeDefined();
  });

  it("shows error screen when query fails", () => {
    mockError = new Error("Failed to load directory");
    renderComponent();

    expect(screen.getByText(/Failed to load directory/i)).toBeDefined();
  });

  it("renders files and allows filtering via search input", () => {
    mockFiles = [
      {
        key: "file_server_properties",
        name: "server.properties",
        mode: "-rw-r--r--",
        modeBits: "0644",
        size: 1024,
        isFile: true,
        isSymlink: false,
        mimetype: "text/plain",
        createdAt: new Date(),
        modifiedAt: new Date(),
        isArchiveType: () => false,
        isEditable: () => true,
      },
      {
        key: "dir_plugins",
        name: "plugins",
        mode: "drwxr-xr-x",
        modeBits: "0755",
        size: 4096,
        isFile: false,
        isSymlink: false,
        mimetype: "inode/directory",
        createdAt: new Date(),
        modifiedAt: new Date(),
        isArchiveType: () => false,
        isEditable: () => false,
      },
    ];

    renderComponent();

    expect(screen.getByText("plugins")).toBeDefined();
    expect(screen.getByText("server.properties")).toBeDefined();

    const searchInput = screen.getByLabelText("Search files…");
    fireEvent.change(searchInput, { target: { value: "prop" } });

    expect(screen.getByText("server.properties")).toBeDefined();
    expect(screen.queryByText("plugins")).toBeNull();

    // Clear search with escape
    fireEvent.keyDown(searchInput, { key: "Escape" });
    expect(screen.getByText("plugins")).toBeDefined();

    // Clear search with clear button
    fireEvent.change(searchInput, { target: { value: "prop" } });
    const clearBtn = screen.getByLabelText("Clear search");
    fireEvent.click(clearBtn);
    expect(screen.getByText("plugins")).toBeDefined();

    // No matching results
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });
    expect(screen.getByText(/No files or directories matching/)).toBeDefined();
    const emptyStateClearBtn = screen.getAllByRole("button", {
      name: "Clear search",
    })[1];
    fireEvent.click(emptyStateClearBtn);
    expect(screen.getByText("plugins")).toBeDefined();
  });

  it("handles retry button on server error", () => {
    mockError = new Error("Load failure");
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("shows empty directory message when files list is empty", () => {
    mockFiles = [];
    renderComponent();

    expect(screen.getByText("This directory seems to be empty.")).toBeDefined();
  });

  it("handles select-all checkbox toggle and indeterminate states", () => {
    mockFiles = [
      {
        key: "f1",
        name: "file1.txt",
        isFile: true,
        isArchiveType: () => false,
        isEditable: () => true,
      } as any,
      {
        key: "f2",
        name: "file2.txt",
        isFile: true,
        isArchiveType: () => false,
        isEditable: () => true,
      } as any,
    ];

    // State 1: 0 selected
    mockSelectedFilesLength = 0;
    const { rerender } = renderComponent();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("false");

    // Click checkbox to select all
    fireEvent.click(checkbox);
    expect(mockSetSelectedFiles).toHaveBeenCalledWith([
      "file1.txt",
      "file2.txt",
    ]);

    // State 2: 1 selected (indeterminate)
    mockSelectedFilesLength = 1;
    rerender(
      <MemoryRouter initialEntries={["/server/srv-1/files#"]}>
        <FileManagerContainer />
      </MemoryRouter>,
    );
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe(
      "mixed",
    );

    // State 3: 2 selected (checked)
    mockSelectedFilesLength = 2;
    rerender(
      <MemoryRouter initialEntries={["/server/srv-1/files#"]}>
        <FileManagerContainer />
      </MemoryRouter>,
    );
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe(
      "true",
    );

    // Click checkbox when checked to deselect all
    fireEvent.click(screen.getByRole("checkbox"));
    expect(mockSetSelectedFiles).toHaveBeenCalledWith([]);
  });

  it("focuses search input when pressing '/' on window but ignores when target is input", () => {
    mockFiles = [];
    renderComponent();

    const searchInput = screen.getByLabelText("Search files…");
    const focusSpy = vi.spyOn(searchInput, "focus");

    // Ignored when target is an input
    fireEvent.keyDown(searchInput, { key: "/" });
    expect(focusSpy).not.toHaveBeenCalled();

    // Ignored when key is not "/"
    fireEvent.keyDown(window, { key: "a" });
    expect(focusSpy).not.toHaveBeenCalled();

    // Ignored when target is a textarea
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { key: "/" });
    expect(focusSpy).not.toHaveBeenCalled();
    document.body.removeChild(textarea);

    // Triggered when target is not input
    fireEvent.keyDown(window, { key: "/" });
    expect(focusSpy).toHaveBeenCalled();
  });

  it("handles checkbox when items are selected but search filter returns 0 results", () => {
    mockFiles = [
      {
        key: "f1",
        name: "test.txt",
        isFile: true,
        isArchiveType: () => false,
        isEditable: () => true,
      } as any,
    ];
    mockSelectedFilesLength = 1;

    renderComponent();

    const searchInput = screen.getByLabelText("Search files…");
    fireEvent.change(searchInput, { target: { value: "nomatch" } });

    // The checkbox is rendered indeterminate because selectedFilesLength > 0 and deferredFilteredFiles is empty (-1)
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");

    // Click checkbox to select empty results
    fireEvent.click(checkbox);
    expect(mockSetSelectedFiles).toHaveBeenCalledWith([]);
  });

  it("handles duplicate file names in sortFiles and null files for checkbox", () => {
    mockFiles = [
      { key: "f1", name: "dup.txt", isFile: true } as any,
      { key: "f2", name: "dup.txt", isFile: true } as any,
      { key: "d1", name: "folder1", isFile: false } as any,
      { key: "d2", name: "folder2", isFile: false } as any,
      { key: "f3", name: "a.txt", isFile: true } as any,
    ];

    const { unmount: unmountFirst } = renderComponent();

    // Verify files rendered without duplicate
    expect(screen.getByText("dup.txt")).toBeDefined();
    expect(screen.getByText("folder1")).toBeDefined();
    unmountFirst();

    // Test checkbox toggle when files is null
    mockFiles = null;
    const { unmount } = renderComponent();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(mockSetSelectedFiles).toHaveBeenCalledWith([]);
    unmount();
  });

  it("renders trash button when fileTrash feature is enabled", () => {
    mockFileTrash = true;
    renderComponent();

    expect(screen.getByRole("link", { name: /Trash/i })).toBeDefined();
  });
});
