import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UploadButton from "./UploadButton";
import axios from "axios";
import getFileUploadUrl from "@/api/server/files/getFileUploadUrl";
import createDirectory from "@/api/server/files/createDirectory";

vi.mock("axios");

vi.mock("@/api/server/files/getFileUploadUrl", () => ({
  default: vi.fn().mockResolvedValue("https://node.example.com/upload"),
}));

vi.mock("@/api/server/files/createDirectory", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/elements/Modal", () => ({
  ModalMask: ({ children }: any) => (
    <div data-testid="modal-mask">{children}</div>
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
        files: { directory: "/" },
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

  it("renders upload button and hidden file inputs", () => {
    const { container } = render(<UploadButton />);

    expect(screen.getByRole("button", { name: /Upload/i })).toBeDefined();

    const fileInputs = container.querySelectorAll("input[type='file']");
    expect(fileInputs.length).toBe(2);
  });

  it("shows drag and drop overlay when dragging files over window", () => {
    render(<UploadButton />);

    expect(screen.queryByTestId("modal-mask")).toBeNull();

    fireEvent.dragEnter(window, {
      dataTransfer: { types: ["Files"] },
    });

    expect(screen.getByTestId("modal-mask")).toBeDefined();

    // Keydown or dragexit closes it
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("modal-mask")).toBeNull();
  });

  it("handles file input change by triggering file uploads", async () => {
    vi.mocked(axios.post).mockResolvedValue({} as any);

    const { container } = render(<UploadButton />);

    const fileInput = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;

    const file = new File(["test content"], "hello.txt", {
      type: "text/plain",
    });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(mockPushFileUpload).toHaveBeenCalled();
      expect(getFileUploadUrl).toHaveBeenCalledWith("srv-uuid-1");
      expect(axios.post).toHaveBeenCalledWith(
        "https://node.example.com/upload",
        expect.any(Object),
        expect.objectContaining({
          params: { directory: "/" },
        }),
      );
    });
  });

  it("handles directory upload with subdirectory creation", async () => {
    vi.mocked(axios.post).mockResolvedValue({} as any);

    const { container } = render(<UploadButton />);

    const fileInputs = container.querySelectorAll("input[type='file']");
    const folderInput = fileInputs[1] as HTMLInputElement;

    const nestedFile = new File(["sub content"], "config.yml", {
      type: "text/plain",
    });
    Object.defineProperty(nestedFile, "webkitRelativePath", {
      value: "my-plugin/config.yml",
    });

    fireEvent.change(folderInput, {
      target: { files: [nestedFile] },
    });

    await waitFor(() => {
      expect(createDirectory).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/",
        "my-plugin",
      );
      expect(axios.post).toHaveBeenCalled();
    });
  });
});
