import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FileManagerContainer from "./FileManagerContainer";
import { MemoryRouter } from "react-router";
import { FileObject } from "@/api/server/files/loadDirectory";

vi.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: ({ count }: any) => ({
    options: { scrollMargin: 0 },
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 41,
        size: 41,
        key: index,
      })),
    getTotalSize: () => count * 41,
  }),
}));

vi.mock("@/components/elements/ScreenBlock", () => ({
  ServerError: ({ message }: any) => (
    <div data-testid="server-error">{message}</div>
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

describe("components/server/files/FileManagerContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFiles = null;
    mockError = null;
    mockSelectedFilesLength = 0;
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
  });

  it("focuses search input when pressing '/' on window", () => {
    mockFiles = [];
    renderComponent();

    const searchInput = screen.getByLabelText("Search files…");
    const focusSpy = vi.spyOn(searchInput, "focus");

    fireEvent.keyDown(window, { key: "/" });
    expect(focusSpy).toHaveBeenCalled();
  });
});
