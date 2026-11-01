import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FileImagePreview from "./FileImagePreview";
import { FileObject } from "@/api/server/files/loadDirectory";

const mocks = vi.hoisted(() => ({
  image: vi.fn(),
  download: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
}));
vi.mock("@/api/server/files/getFileImage", () => ({ default: mocks.image }));
vi.mock("@/api/server/files/getFileDownloadUrl", () => ({
  default: mocks.download,
}));
vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: { data: { uuid: "server" } },
        files: { directory: "/photos" },
      }),
  },
}));
vi.mock("@/components/elements/dialog", () => ({
  Dialog: Object.assign(
    ({ children, title }: any) => (
      <div role="dialog">
        <h1>{title}</h1>
        {children}
      </div>
    ),
    {
      Footer: ({ children }: any) => <footer>{children}</footer>,
      Icon: () => null,
    },
  ),
}));

const file = {
  name: "space # photo.png",
  isFile: true,
  mimetype: "image/png",
  size: 2048,
} as FileObject;
beforeEach(() => {
  mocks.image.mockResolvedValue(
    new Blob([new Uint8Array([0, 255, 128])], { type: "text/plain" }),
  );
  mocks.create.mockReturnValue("blob:private-image");
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: mocks.create,
      revokeObjectURL: mocks.revoke,
    }),
  );
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("private file image previews", () => {
  it("ignores a rejected request after closing the preview", async () => {
    let reject!: (error: Error) => void;
    mocks.image.mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const { unmount } = render(
      <FileImagePreview file={file} onClose={vi.fn()} />,
    );
    unmount();
    await act(async () => {
      reject(new DOMException("Cancelled", "AbortError"));
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("reports a failed download and allows a retry", async () => {
    mocks.download.mockRejectedValueOnce(new Error("Download unavailable"));
    render(<FileImagePreview file={file} onClose={vi.fn()} />);
    fireEvent.load(await screen.findByAltText(file.name));
    fireEvent.click(screen.getByRole("button", { name: /Download/ }));
    await screen.findByRole("alert");
    expect(
      (screen.getByRole("button", { name: /Download/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("fetches the exact path, renders image dimensions and releases its object URL", async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <FileImagePreview file={file} onClose={onClose} />,
    );
    await waitFor(() => expect(screen.getByAltText(file.name)).toBeDefined());
    expect(mocks.image).toHaveBeenCalledWith(
      "server",
      "/photos/space # photo.png",
      expect.any(AbortSignal),
    );
    expect(mocks.create.mock.calls[0][0].type).toBe("image/png");
    const img = screen.getByAltText(file.name);
    Object.defineProperties(img, {
      naturalWidth: { value: 640 },
      naturalHeight: { value: 480 },
    });
    fireEvent.load(img);
    expect(screen.getByText(/640 × 480/)).toBeDefined();
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(mocks.revoke).toHaveBeenCalledWith("blob:private-image");
  });
  it("shows a useful fallback when fetching or decoding fails", async () => {
    mocks.image.mockRejectedValueOnce(new Error("Too large"));
    const { unmount } = render(
      <FileImagePreview file={file} onClose={vi.fn()} />,
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "You can still download it",
    );
    unmount();
    render(<FileImagePreview file={file} onClose={vi.fn()} />);
    fireEvent.error(await screen.findByAltText(file.name));
    expect(screen.getByRole("alert")).toBeDefined();
  });
  it("aborts on close and never creates a URL for a late response", async () => {
    let resolve!: (value: Blob) => void;
    mocks.image.mockReturnValueOnce(
      new Promise<Blob>((done) => {
        resolve = done;
      }),
    );
    const { unmount } = render(
      <FileImagePreview file={file} onClose={vi.fn()} />,
    );
    const signal = mocks.image.mock.calls[0][2];
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolve(new Blob(["late"]));
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not fetch active content formats such as SVG", async () => {
    render(
      <FileImagePreview
        file={{ ...file, name: "vector.svg", mimetype: "image/svg+xml" }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toBeDefined();
    expect(mocks.image).not.toHaveBeenCalled();
  });
  it("keeps a download available when the preview fails", async () => {
    mocks.image.mockRejectedValueOnce(new Error("Preview unavailable"));
    mocks.download.mockResolvedValue(
      "http://localhost/download/file?token=redacted-test",
    );
    const assign = vi
      .spyOn(window.location, "assign")
      .mockImplementation(() => {});
    render(<FileImagePreview file={file} onClose={vi.fn()} />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: /Download/ }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "http://localhost/download/file?token=redacted-test",
      ),
    );
    expect(mocks.download).toHaveBeenCalledWith(
      "server",
      "/photos/space # photo.png",
    );
    assign.mockRestore();
  });
});
