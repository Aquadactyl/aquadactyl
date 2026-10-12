import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import RenameFileModal from "@/components/server/files/RenameFileModal";
import { ServerContext } from "@/state/server";
import renameFiles from "@/api/server/files/renameFiles";

vi.mock("@/api/server/files/renameFiles");

const mockMutate = vi.fn().mockImplementation((fn) => {
  if (typeof fn === "function") {
    return fn([{ name: "old_name.txt" }, { name: "other.txt" }]);
  }
  return Promise.resolve();
});
vi.mock("@/plugins/useFileManagerQuery", () => ({
  default: () => ({
    mutate: mockMutate,
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

const Inner = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setDirectory = ServerContext.useStoreActions(
    (a) => a.files.setDirectory,
  );

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-uuid-xyz",
    } as any);
    setDirectory("/server");
  }, [setServer, setDirectory]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ServerContext.Provider>
      <Inner>{children}</Inner>
    </ServerContext.Provider>
  );
};

describe("RenameFileModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with Rename label and prefilled name for single file", () => {
    render(
      <Wrapper>
        <RenameFileModal
          visible
          files={["server.properties"]}
          onDismissed={vi.fn()}
        />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Name") as HTMLInputElement;
    expect(input.value).toBe("server.properties");
    expect(screen.getByRole("button", { name: "Rename" })).toBeDefined();
  });

  it("renders with Move terminology when useMoveTerminology is true", async () => {
    vi.mocked(renameFiles).mockResolvedValueOnce(undefined as any);
    const onDismissed = vi.fn();

    render(
      <Wrapper>
        <RenameFileModal
          visible
          useMoveTerminology
          files={["server.properties"]}
          onDismissed={onDismissed}
        />
      </Wrapper>,
    );

    expect(screen.getByRole("button", { name: "Move" })).toBeDefined();
    expect(screen.getByText(/New location:/)).toBeDefined();

    const input = screen.getByLabelText("File Name");
    fireEvent.change(input, { target: { value: "new_dir" } });
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => {
      expect(renameFiles).toHaveBeenCalledWith("server-uuid-xyz", "/server", [
        { from: "server.properties", to: "new_dir" },
      ]);
      expect(onDismissed).toHaveBeenCalled();
    });
  });

  it("submits rename API call and closes on success", async () => {
    vi.mocked(renameFiles).mockResolvedValueOnce(undefined as any);
    const onDismissed = vi.fn();

    render(
      <Wrapper>
        <RenameFileModal
          visible
          files={["old_name.txt"]}
          onDismissed={onDismissed}
        />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Name");
    fireEvent.change(input, { target: { value: "new_name.txt" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => {
      expect(renameFiles).toHaveBeenCalledWith("server-uuid-xyz", "/server", [
        { from: "old_name.txt", to: "new_name.txt" },
      ]);
      expect(mockMutate).toHaveBeenCalled();
      expect(onDismissed).toHaveBeenCalled();
    });
  });

  it("handles move with multiple files correctly", async () => {
    vi.mocked(renameFiles).mockResolvedValueOnce(undefined as any);
    const onDismissed = vi.fn();

    render(
      <Wrapper>
        <RenameFileModal
          visible
          useMoveTerminology
          files={["file1.txt", "file2.txt"]}
          onDismissed={onDismissed}
        />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Name");
    fireEvent.change(input, { target: { value: "backup_folder" } });
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => {
      expect(renameFiles).toHaveBeenCalledWith("server-uuid-xyz", "/server", [
        { from: "file1.txt", to: "backup_folder/file1.txt" },
        { from: "file2.txt", to: "backup_folder/file2.txt" },
      ]);
      expect(onDismissed).toHaveBeenCalled();
    });
  });

  it("handles API rejection and reports flash error", async () => {
    const error = new Error("Failed to rename file");
    vi.mocked(renameFiles).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <RenameFileModal visible files={["file.txt"]} onDismissed={vi.fn()} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith({
        key: "files",
        error,
      });
    });
  });

  it("handles single file move with slash in path", async () => {
    vi.mocked(renameFiles).mockResolvedValueOnce(undefined as any);
    const onDismissed = vi.fn();

    render(
      <Wrapper>
        <RenameFileModal
          visible
          files={["old_name.txt"]}
          onDismissed={onDismissed}
        />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Name");
    fireEvent.change(input, { target: { value: "nested/dir/new_name.txt" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => {
      expect(renameFiles).toHaveBeenCalledWith("server-uuid-xyz", "/server", [
        { from: "old_name.txt", to: "nested/dir/new_name.txt" },
      ]);
      expect(onDismissed).toHaveBeenCalled();
    });
  });

  it("handles empty files array and multiple files without move terminology", async () => {
    vi.mocked(renameFiles).mockResolvedValueOnce(undefined as any);
    const onDismissed = vi.fn();

    const { rerender } = render(
      <Wrapper>
        <RenameFileModal visible files={[]} onDismissed={onDismissed} />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Name") as HTMLInputElement;
    expect(input.value).toBe("");

    fireEvent.change(input, { target: { value: "some_name.txt" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => {
      expect(renameFiles).toHaveBeenCalledWith(
        "server-uuid-xyz",
        "/server",
        [],
      );
      expect(onDismissed).toHaveBeenCalled();
    });

    // Multiple files without useMoveTerminology
    vi.mocked(renameFiles).mockResolvedValueOnce(undefined as any);
    rerender(
      <Wrapper>
        <RenameFileModal
          visible
          files={["fileA.txt", "fileB.txt"]}
          onDismissed={onDismissed}
        />
      </Wrapper>,
    );

    const input2 = screen.getByLabelText("File Name");
    fireEvent.change(input2, { target: { value: "shared_dest" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => {
      expect(renameFiles).toHaveBeenCalledWith("server-uuid-xyz", "/server", [
        { from: "fileA.txt", to: "shared_dest" },
        { from: "fileB.txt", to: "shared_dest" },
      ]);
    });
  });
});
