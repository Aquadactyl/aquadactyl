import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UploadButton, { runWithConcurrency } from "./UploadButton";
import axios from "axios";
import createDirectory from "@/api/server/files/createDirectory";

vi.mock("axios");

vi.mock("@/api/server/files/getFileUploadUrl", () => ({
  default: vi.fn().mockResolvedValue("https://node.example.com/upload"),
}));

vi.mock("@/api/server/files/createDirectory", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/elements/Modal", () => ({
  ModalMask: ({ children, onClick, onDragOver, onDrop }: any) => (
    <div
      data-testid="modal-mask"
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
    </div>
  ),
}));

vi.mock("@/components/elements/Portal", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/Fade", () => ({
  default: ({ children, in: inProp }: any) => (inProp ? <>{children}</> : null),
}));

const mockMutate = vi.fn();
vi.mock("@/plugins/useFileManagerQuery", () => ({
  default: () => ({ mutate: mockMutate }),
}));

const mockClearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({ clearAndAddHttpError: mockClearAndAddHttpError }),
}));

const mockPushFileUpload = vi.fn();
const mockSetUploadProgress = vi.fn();
const mockRemoveFileUpload = vi.fn();
const mockClearFileUploads = vi.fn();

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: { data: { uuid: "srv-uuid-1" } },
        files: { directory: "/base" },
      }),
    useStoreActions: (selector: any) =>
      selector({
        files: {
          pushFileUpload: mockPushFileUpload,
          setUploadProgress: mockSetUploadProgress,
          removeFileUpload: mockRemoveFileUpload,
          clearFileUploads: mockClearFileUploads,
        },
      }),
  },
}));

describe("components/server/files/UploadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders upload button and hidden file inputs", () => {
    const { container } = render(<UploadButton className="custom-class" />);

    expect(screen.getByRole("button", { name: /Upload/i })).toBeDefined();

    const fileInputs = container.querySelectorAll("input[type='file']");
    expect(fileInputs.length).toBe(2);
  });

  it("handles drag events and drag exit / non-file drag", () => {
    render(<UploadButton />);

    expect(screen.queryByTestId("modal-mask")).toBeNull();

    // Drag enter without dataTransfer or without types
    window.dispatchEvent(new Event("dragenter"));
    expect(screen.queryByTestId("modal-mask")).toBeNull();

    fireEvent.dragEnter(window, {
      dataTransfer: { types: [] },
    });
    expect(screen.queryByTestId("modal-mask")).toBeNull();

    // Drag enter with non-files
    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["text/plain"] },
    });
    expect(screen.queryByTestId("modal-mask")).toBeNull();

    // Drag enter with files
    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });
    expect(screen.getByTestId("modal-mask")).toBeDefined();

    // Drag exit closes it
    fireEvent.dragExit(window);
    expect(screen.queryByTestId("modal-mask")).toBeNull();

    // Open again and close by keydown
    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });
    expect(screen.getByTestId("modal-mask")).toBeDefined();
    fireEvent.keyDown(window);
    expect(screen.queryByTestId("modal-mask")).toBeNull();

    // Open again and close by clicking mask
    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });
    expect(screen.getByTestId("modal-mask")).toBeDefined();
    fireEvent.click(screen.getByTestId("modal-mask"));
    expect(screen.queryByTestId("modal-mask")).toBeNull();
  });

  it("handles file input change with empty files and with valid files", async () => {
    vi.mocked(axios.post).mockImplementation((_url, _data, config: any) => {
      if (config?.onUploadProgress) {
        config.onUploadProgress({ loaded: 50 });
      }
      return Promise.resolve({});
    });

    const { container } = render(<UploadButton />);
    const fileInputs = container.querySelectorAll("input[type='file']");
    const fileInput = fileInputs[0] as HTMLInputElement;

    // Change with no files
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(mockPushFileUpload).not.toHaveBeenCalled();

    // Change with file
    const file = new File(["test content"], "hello.txt", {
      type: "text/plain",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockPushFileUpload).toHaveBeenCalledWith({
      name: "hello.txt",
      data: expect.objectContaining({ loaded: 0, total: file.size }),
    });

    await waitFor(
      () => {
        expect(mockSetUploadProgress).toHaveBeenCalledWith({
          name: "hello.txt",
          loaded: 50,
        });
        expect(mockRemoveFileUpload).toHaveBeenCalledWith("hello.txt");
        expect(mockMutate).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it("handles drop with only empty directories", async () => {
    render(<UploadButton />);

    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });

    const modalMask = screen.getByTestId("modal-mask");

    const emptyDirEntry = {
      isFile: false,
      isDirectory: true,
      name: "justEmpty",
      createReader: () => ({
        readEntries: (resolve: any) => resolve([]),
      }),
    };

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        items: [
          {
            kind: "file",
            webkitGetAsEntry: () => emptyDirEntry,
            getAsFile: () => null,
          },
        ],
        files: [],
      },
    };

    fireEvent.drop(modalMask, dropEvent);

    await waitFor(() => {
      expect(createDirectory).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/base",
        "justEmpty",
      );
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("handles folder input change with empty files and nested files", async () => {
    vi.mocked(axios.post).mockResolvedValue({} as any);

    const { container } = render(<UploadButton />);
    const fileInputs = container.querySelectorAll("input[type='file']");
    const folderInput = fileInputs[1] as HTMLInputElement;

    // Change with no files
    fireEvent.change(folderInput, { target: { files: [] } });
    expect(createDirectory).not.toHaveBeenCalled();

    // Change with nested file
    const nestedFile = new File(["sub"], "config.yml", { type: "text/plain" });
    Object.defineProperty(nestedFile, "webkitRelativePath", {
      value: "folder/nested/config.yml",
    });
    const rootFile = new File(["root"], "root.txt", { type: "text/plain" });

    fireEvent.change(folderInput, {
      target: { files: [nestedFile, rootFile] },
    });

    await waitFor(() => {
      expect(createDirectory).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/base",
        "folder",
      );
      expect(createDirectory).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/base/folder",
        "nested",
      );
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it("handles upload failure and ignores directory creation errors", async () => {
    vi.mocked(createDirectory).mockRejectedValue(new Error("directory exists"));
    const uploadError = new Error("Network error");
    vi.mocked(axios.post).mockRejectedValue(uploadError);

    const { container } = render(<UploadButton />);
    const fileInputs = container.querySelectorAll("input[type='file']");
    const folderInput = fileInputs[1] as HTMLInputElement;

    const nestedFile = new File(["sub"], "fail.txt", { type: "text/plain" });
    Object.defineProperty(nestedFile, "webkitRelativePath", {
      value: "dir1/fail.txt",
    });

    fireEvent.change(folderInput, { target: { files: [nestedFile] } });

    await waitFor(() => {
      expect(mockClearFileUploads).toHaveBeenCalled();
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith(uploadError);
    });
  });

  it("handles drop with webkitGetAsEntry (files, directories, empty directories, error)", async () => {
    vi.mocked(axios.post).mockResolvedValue({} as any);

    render(<UploadButton />);

    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });

    const modalMask = screen.getByTestId("modal-mask");
    fireEvent.dragOver(modalMask);

    const file1 = new File(["file1"], "root.txt");
    const file2 = new File(["file2"], "child.txt");

    const fileEntry1 = {
      isFile: true,
      isDirectory: false,
      name: "root.txt",
      file: (resolve: any) => resolve(file1),
    };

    const emptyDirEntry = {
      isFile: false,
      isDirectory: true,
      name: "emptyFolder",
      createReader: () => ({
        readEntries: (resolve: any) => resolve([]),
      }),
    };

    let readCount = 0;
    const populatedDirEntry = {
      isFile: false,
      isDirectory: true,
      name: "fullFolder",
      createReader: () => ({
        readEntries: (resolve: any) => {
          if (readCount === 0) {
            readCount++;
            resolve([
              {
                isFile: true,
                isDirectory: false,
                name: "child.txt",
                file: (res: any) => res(file2),
              },
            ]);
          } else {
            resolve([]);
          }
        },
      }),
    };

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        items: [
          {
            kind: "string",
            webkitGetAsEntry: () => null,
            getAsFile: () => null,
          }, // Non-file kind
          {
            kind: "file",
            webkitGetAsEntry: () => fileEntry1,
            getAsFile: () => file1,
          },
          {
            kind: "file",
            webkitGetAsEntry: () => emptyDirEntry,
            getAsFile: () => null,
          },
          {
            kind: "file",
            webkitGetAsEntry: () => populatedDirEntry,
            getAsFile: () => null,
          },
        ],
        files: [],
      },
    };

    fireEvent.drop(modalMask, dropEvent);

    await waitFor(() => {
      expect(createDirectory).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/base",
        "emptyFolder",
      );
      expect(createDirectory).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/base",
        "fullFolder",
      );
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it("handles drop with item.getAsFile fallback when webkitGetAsEntry is null", async () => {
    vi.mocked(axios.post).mockResolvedValue({} as any);

    render(<UploadButton />);

    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });

    const modalMask = screen.getByTestId("modal-mask");
    const file = new File(["file content"], "fallback.txt");

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        items: [
          {
            kind: "file",
            // item.webkitGetAsEntry is undefined
            getAsFile: () => file,
          },
          {
            kind: "file",
            // item.webkitGetAsEntry is undefined and getAsFile is null
            getAsFile: () => null,
          },
          {
            kind: "file",
            // webkitGetAsEntry returns null
            webkitGetAsEntry: () => null,
            getAsFile: () => null,
          },
        ],
        files: [],
      },
    };

    fireEvent.drop(modalMask, dropEvent);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it("handles drop with dataTransfer.files fallback when items is not present", async () => {
    vi.mocked(axios.post).mockResolvedValue({} as any);

    render(<UploadButton />);

    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });

    const modalMask = screen.getByTestId("modal-mask");
    const file = new File(["file content"], "direct.txt");
    const fileWithRelative = new File(["sub content"], "nested.txt");
    Object.defineProperty(fileWithRelative, "webkitRelativePath", {
      value: "sub/nested.txt",
    });

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [file, fileWithRelative],
      },
    };

    fireEvent.drop(modalMask, dropEvent);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it("handles drop entry error gracefully with Error and non-Error rejection", async () => {
    render(<UploadButton />);

    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });

    const modalMask = screen.getByTestId("modal-mask");

    const errorEntry = {
      isFile: true,
      isDirectory: false,
      name: "error.txt",
      file: (_resolve: any, reject: any) =>
        reject(new Error("File read error")),
    };

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        items: [
          {
            kind: "file",
            webkitGetAsEntry: () => errorEntry,
            getAsFile: () => null,
          },
        ],
        files: [],
      },
    };

    fireEvent.drop(modalMask, dropEvent);

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Test non-Error rejection (string)
    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });
    const modalMask2 = screen.getByTestId("modal-mask");

    const stringErrorEntry = {
      isFile: true,
      isDirectory: false,
      name: "string-error.txt",
      file: (_resolve: any, reject: any) => reject("Plain string rejection"),
    };
    fireEvent.drop(modalMask2, {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        items: [
          {
            kind: "file",
            webkitGetAsEntry: () => stringErrorEntry,
            getAsFile: () => null,
          },
        ],
        files: [],
      },
    });

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Plain string rejection" }),
      );
    });
  });

  it("handles drop entry directory reader error silently and handles empty drop", async () => {
    render(<UploadButton />);

    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });

    const modalMask = screen.getByTestId("modal-mask");

    const errorDirEntry = {
      isFile: false,
      isDirectory: true,
      name: "errDir",
      createReader: () => ({
        readEntries: (_resolve: any, reject: any) =>
          reject(new Error("Dir read error")),
      }),
    };

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        items: [
          {
            kind: "file",
            webkitGetAsEntry: () => errorDirEntry,
            getAsFile: () => null,
          },
        ],
        files: [],
      },
    };

    fireEvent.drop(modalMask, dropEvent);

    // Also drop empty dataTransfer
    fireEvent.drop(modalMask, {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { items: [], files: [] },
    });
    expect(modalMask).toBeDefined();
  });

  it("cleans up timeouts on unmount", () => {
    const { unmount } = render(<UploadButton />);
    expect(() => unmount()).not.toThrow();
  });

  it("triggers file input clicks when menu items are clicked", () => {
    const { container } = render(<UploadButton />);

    const fileInputs = container.querySelectorAll("input[type='file']");
    const fileInput = fileInputs[0] as HTMLInputElement;
    const folderInput = fileInputs[1] as HTMLInputElement;

    const fileClickSpy = vi.spyOn(fileInput, "click");
    const folderClickSpy = vi.spyOn(folderInput, "click");

    // Open menu dropdown
    const trigger = screen.getByRole("button", { name: /Upload/i });
    fireEvent.click(trigger);

    const uploadFilesItem = screen.getByText("Upload Files");
    fireEvent.click(uploadFilesItem);
    expect(fileClickSpy).toHaveBeenCalled();

    const uploadFolderItem = screen.getByText("Upload Folder");
    fireEvent.click(uploadFolderItem);
    expect(folderClickSpy).toHaveBeenCalled();
  });

  it("exercises runWithConcurrency concurrent rejections, empty list, and successful tasks", async () => {
    // Empty tasks
    const emptyRes = await runWithConcurrency([]);
    expect(emptyRes).toEqual([]);

    // Successful tasks with custom limit
    const successTasks = [() => Promise.resolve(1), () => Promise.resolve(2)];
    const res = await runWithConcurrency(successTasks, 1);
    expect(res).toEqual([1, 2]);

    // Concurrent rejections where both fail at the same time
    let rejectPromise: any;
    const p = new Promise((_, reject) => {
      rejectPromise = reject;
    });
    const tasks = [() => p, () => p, () => p];
    const runPromise = runWithConcurrency(tasks, 3);
    rejectPromise(new Error("concurrent failure"));

    await expect(runPromise).rejects.toThrow("concurrent failure");
  });

  it("handles drop with entry that is neither file nor directory and mounts with null folder ref", async () => {
    render(<UploadButton />);

    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });

    const modalMask = screen.getByTestId("modal-mask");

    const unknownEntry = {
      isFile: false,
      isDirectory: false,
      name: "unknown_device",
    };

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        items: [
          {
            kind: "file",
            webkitGetAsEntry: () => unknownEntry,
            getAsFile: () => null,
          },
        ],
        files: [],
      },
    };

    fireEvent.drop(modalMask, dropEvent);

    // Drop with no dataTransfer or no files to cover all optional chain branches of line 289
    fireEvent.drop(modalMask, {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {},
    });
    fireEvent.drop(modalMask, {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    // Tests null folder ref branch on mount
    let nullCount = 0;
    const origUseRef = React.useRef;
    vi.spyOn(React, "useRef").mockImplementation((initialValue: any) => {
      const ref = origUseRef(initialValue);
      if (initialValue === null) {
        nullCount++;
        if (nullCount === 2) {
          return {
            get current() {
              return null;
            },
            set current(_val) {},
          } as any;
        }
      }
      return ref;
    });

    render(<UploadButton />);
    expect(modalMask).toBeDefined();
    vi.restoreAllMocks();
  });
});
