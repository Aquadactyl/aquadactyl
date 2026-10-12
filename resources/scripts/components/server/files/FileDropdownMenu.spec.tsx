import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import FileDropdownMenu from "./FileDropdownMenu";
import { ServerContext } from "@/state/server";
import { FileObject } from "@/api/server/files/loadDirectory";
import deleteFiles from "@/api/server/files/deleteFiles";
import copyFile from "@/api/server/files/copyFile";
import getFileDownloadUrl from "@/api/server/files/getFileDownloadUrl";
import compressFiles from "@/api/server/files/compressFiles";
import decompressFiles from "@/api/server/files/decompressFiles";
import useFileManagerQuery from "@/plugins/useFileManagerQuery";
import { moveFilesToTrash } from "@/api/server/files/trash";

vi.mock("@/api/server/files/deleteFiles");
vi.mock("@/api/server/files/trash");
vi.mock("@/api/server/files/copyFile");
vi.mock("@/api/server/files/getFileDownloadUrl");
vi.mock("@/api/server/files/compressFiles");
vi.mock("@/api/server/files/decompressFiles");
vi.mock("@/plugins/useFileManagerQuery");

vi.mock("@/components/server/files/DeleteFilesDialog", () => ({
  default: ({ open, onDelete, onTrash, title, onClose }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <h1>{title}</h1>
        <button onClick={onDelete}>Delete</button>
        <button onClick={onTrash}>Trash</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock("@blueprint/components/Server/Files/Browse/DropdownItems", () => ({
  default: () => null,
}));

let attachRef = true;
vi.mock("@/components/elements/DropdownMenu", () => ({
  default: React.forwardRef(({ children, renderToggle }: any, ref: any) => {
    const [open, setOpen] = React.useState(true);
    React.useImperativeHandle(ref, () =>
      attachRef
        ? {
            triggerMenu: () => setOpen(true),
          }
        : null,
    );
    return (
      <div>
        {renderToggle(() => setOpen((prev) => !prev))}
        {open && <div data-testid="dropdown-content">{children}</div>}
      </div>
    );
  }),
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

vi.mock("@/components/server/files/RenameFileModal", () => ({
  default: ({ visible, onDismissed, useMoveTerminology }: any) =>
    visible ? (
      <div data-testid="rename-modal">
        <span>{useMoveTerminology ? "Move Modal" : "Rename Modal"}</span>
        <button onClick={onDismissed}>Dismiss</button>
      </div>
    ) : null,
}));

vi.mock("@/components/server/files/ChmodFileModal", () => ({
  default: ({ visible, onDismissed }: any) =>
    visible ? (
      <div data-testid="chmod-modal">
        <span>Chmod Modal</span>
        <button onClick={onDismissed}>Dismiss</button>
      </div>
    ) : null,
}));

const mockFile: FileObject = {
  key: "file_test.txt",
  name: "test.txt",
  mode: "-rw-r--r--",
  modeBits: "644",
  size: 1024,
  isFile: true,
  isSymlink: false,
  mimetype: "text/plain",
  createdAt: new Date(),
  modifiedAt: new Date(),
  isArchiveType: () => false,
  isEditable: () => true,
};

const mockArchiveFile: FileObject = {
  key: "file_archive.zip",
  name: "archive.zip",
  mode: "-rw-r--r--",
  modeBits: "644",
  size: 2048,
  isFile: true,
  isSymlink: false,
  mimetype: "application/zip",
  createdAt: new Date(),
  modifiedAt: new Date(),
  isArchiveType: () => true,
  isEditable: () => false,
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState(
    (s) => !!s.server.data && s.server.permissions.length > 0,
  );
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );
  const setDirectory = ServerContext.useStoreActions(
    (a) => a.files.setDirectory,
  );

  useEffect(() => {
    setServer({
      id: "serv_1" as any,
      uuid: "server-uuid-1",
      name: "Test Server",
      node: "Node 1",
      isNodeUnderMaintenance: false,
      status: null,
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
    } as any);
    setPermissions(["*"]);
    setDirectory("/");
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/files/FileDropdownMenu", () => {
  const mockMutate = vi.fn().mockImplementation((fn) => {
    if (typeof fn === "function") {
      return fn([{ key: "file_test.txt" }, { key: "file_other.txt" }]);
    }
    return Promise.resolve([]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFileManagerQuery).mockReturnValue({
      mutate: mockMutate,
    } as any);
  });

  it("renders menu options for a standard editable file", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("Rename")).toBeDefined();
    expect(screen.getByText("Move")).toBeDefined();
    expect(screen.getByText("Permissions")).toBeDefined();
    expect(screen.getByText("Copy")).toBeDefined();
    expect(screen.getByText("Archive")).toBeDefined();
    expect(screen.getByText("Download")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("renders Unarchive option instead of Archive for archive file", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockArchiveFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("Unarchive")).toBeDefined();
    expect(screen.queryByText("Archive")).toBeNull();
  });

  it("opens rename modal on Rename click and dismisses it", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const renameBtn = await screen.findByText("Rename");
    fireEvent.click(renameBtn);
    expect(screen.getByTestId("rename-modal")).toBeDefined();
    expect(screen.getByText("Rename Modal")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("rename-modal")).toBeNull();
  });

  it("opens move modal on Move click", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const moveBtn = await screen.findByText("Move");
    fireEvent.click(moveBtn);
    expect(screen.getByTestId("rename-modal")).toBeDefined();
    expect(screen.getByText("Move Modal")).toBeDefined();
  });

  it("opens chmod modal on Permissions click", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const permBtn = await screen.findByText("Permissions");
    fireEvent.click(permBtn);
    expect(screen.getByTestId("chmod-modal")).toBeDefined();
  });

  it("handles copy action", async () => {
    vi.mocked(copyFile).mockResolvedValueOnce(undefined as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const copyBtn = await screen.findByText("Copy");
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(copyFile).toHaveBeenCalledWith("server-uuid-1", "/test.txt");
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("handles archive action", async () => {
    vi.mocked(compressFiles).mockResolvedValueOnce({} as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const archiveBtn = await screen.findByText("Archive");
    fireEvent.click(archiveBtn);
    await waitFor(() => {
      expect(compressFiles).toHaveBeenCalledWith("server-uuid-1", "/", [
        "test.txt",
      ]);
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("handles unarchive action", async () => {
    vi.mocked(decompressFiles).mockResolvedValueOnce(undefined as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockArchiveFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const unarchiveBtn = await screen.findByText("Unarchive");
    fireEvent.click(unarchiveBtn);
    await waitFor(() => {
      expect(decompressFiles).toHaveBeenCalledWith(
        "server-uuid-1",
        "/",
        "archive.zip",
      );
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("handles download action", async () => {
    vi.mocked(getFileDownloadUrl).mockResolvedValueOnce(
      "https://daemon.example.com/download/test.txt",
    );

    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const downloadBtn = await screen.findByText("Download");
    fireEvent.click(downloadBtn);
    await waitFor(() => {
      expect(getFileDownloadUrl).toHaveBeenCalledWith(
        "server-uuid-1",
        "/test.txt",
      );
    });
  });

  it("opens delete confirmation and executes deletion", async () => {
    vi.mocked(deleteFiles).mockResolvedValueOnce(undefined as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteMenuBtn = await screen.findByText("Delete");
    fireEvent.click(deleteMenuBtn);

    const dialog = screen.getByTestId("confirm-dialog");
    expect(dialog).toBeDefined();
    expect(screen.getByText("Delete File")).toBeDefined();

    const confirmBtn = within(dialog).getByRole("button", { name: "Delete" });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(deleteFiles).toHaveBeenCalledWith("server-uuid-1", "/", [
        "test.txt",
      ]);
    });
  });

  it("opens delete confirmation and executes moveFilesToTrash when trash is confirmed", async () => {
    vi.mocked(moveFilesToTrash).mockResolvedValueOnce(undefined as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteMenuBtn = await screen.findByText("Delete");
    fireEvent.click(deleteMenuBtn);

    const dialog = screen.getByTestId("confirm-dialog");
    expect(dialog).toBeDefined();

    const trashBtn = within(dialog).getByRole("button", { name: "Trash" });
    fireEvent.click(trashBtn);
    await waitFor(() => {
      expect(moveFilesToTrash).toHaveBeenCalledWith("server-uuid-1", "/", [
        "test.txt",
      ]);
    });
  });

  it("triggers menu via custom context event and dismisses chmod modal", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    window.dispatchEvent(
      new CustomEvent(`pterodactyl:files:ctx:${mockFile.key}`, {
        detail: 150,
      }),
    );

    const permBtn = await screen.findByText("Permissions");
    fireEvent.click(permBtn);
    expect(screen.getByTestId("chmod-modal")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("chmod-modal")).toBeNull();

    // Also test event when ref is null
    attachRef = false;
    const { unmount } = render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );
    window.dispatchEvent(
      new CustomEvent(`pterodactyl:files:ctx:${mockFile.key}`, {
        detail: 150,
      }),
    );
    unmount();
    attachRef = true;
  });

  it("handles deletion for directory and cancels confirmation", async () => {
    const dirFile: FileObject = {
      ...mockFile,
      name: "subfolder",
      isFile: false,
    };

    render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={dirFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteMenuBtn = await screen.findByText("Delete");
    fireEvent.click(deleteMenuBtn);

    const dialog = screen.getByTestId("confirm-dialog");
    expect(screen.getByText("Delete Directory")).toBeDefined();

    const cancelBtn = within(dialog).getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
  });

  it("handles errors across copy, download, archive, unarchive, and delete actions", async () => {
    vi.mocked(copyFile).mockRejectedValueOnce(new Error("Copy error"));
    vi.mocked(getFileDownloadUrl).mockRejectedValueOnce(
      new Error("Download error"),
    );
    vi.mocked(compressFiles).mockRejectedValueOnce(new Error("Archive error"));
    vi.mocked(decompressFiles).mockRejectedValueOnce(
      new Error("Unarchive error"),
    );
    vi.mocked(deleteFiles).mockRejectedValueOnce(new Error("Delete error"));

    const { rerender } = render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    // Copy error
    fireEvent.click(await screen.findByText("Copy"));
    await waitFor(() => expect(copyFile).toHaveBeenCalled());

    // Download error
    fireEvent.click(screen.getByText("Download"));
    await waitFor(() => expect(getFileDownloadUrl).toHaveBeenCalled());

    // Archive error
    fireEvent.click(screen.getByText("Archive"));
    await waitFor(() => expect(compressFiles).toHaveBeenCalled());

    // Delete error
    fireEvent.click(screen.getByText("Delete"));
    const dialog = screen.getByTestId("confirm-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteFiles).toHaveBeenCalled());

    // Unarchive error on archive file
    rerender(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={mockArchiveFile} />
        </Wrapper>
      </ServerContext.Provider>,
    );
    fireEvent.click(await screen.findByText("Unarchive"));
    await waitFor(() => expect(decompressFiles).toHaveBeenCalled());
  });

  it("exercises memo comparator on rerender with identical and changed props", () => {
    const fileA = { ...mockFile };
    const fileB = { ...mockFile };
    const fileC = { ...mockFile, name: "different.txt" };

    const { rerender, container } = render(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={fileA} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    rerender(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={fileB} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    rerender(
      <ServerContext.Provider>
        <Wrapper>
          <FileDropdownMenu file={fileC} />
        </Wrapper>
      </ServerContext.Provider>,
    );
    expect(container.firstChild).toBeDefined();
  });
});
