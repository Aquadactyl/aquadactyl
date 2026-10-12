import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import ChmodFileModal from "@/components/server/files/ChmodFileModal";
import { ServerContext } from "@/state/server";
import chmodFiles from "@/api/server/files/chmodFiles";

vi.mock("@/api/server/files/chmodFiles");

const mockMutate = vi.fn().mockImplementation((fn) => {
  if (typeof fn === "function") {
    return fn([
      { name: "test.sh", isFile: true, mode: "0644", modeBits: "0644" },
      { name: "other.sh", isFile: false, mode: "0755", modeBits: "0755" },
    ]);
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
      uuid: "server-chmod-uuid",
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

describe("ChmodFileModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with File Mode input prefilled for single file", () => {
    render(
      <Wrapper>
        <ChmodFileModal
          visible
          files={[{ file: "test.sh", mode: "0755" }]}
          onDismissed={vi.fn()}
        />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Mode") as HTMLInputElement;
    expect(input.value).toBe("0755");
    expect(screen.getByRole("button", { name: "Update" })).toBeDefined();
  });

  it("submits chmod API request and calls onDismissed", async () => {
    vi.mocked(chmodFiles).mockResolvedValueOnce(undefined as any);
    const onDismissed = vi.fn();

    render(
      <Wrapper>
        <ChmodFileModal
          visible
          files={[{ file: "test.sh", mode: "0644" }]}
          onDismissed={onDismissed}
        />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Mode");
    fireEvent.change(input, { target: { value: "0755" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(chmodFiles).toHaveBeenCalledWith("server-chmod-uuid", "/server", [
        { file: "test.sh", mode: "0755" },
      ]);
      expect(mockMutate).toHaveBeenCalled();
      expect(onDismissed).toHaveBeenCalled();
    });
  });

  it("handles multiple files mode update", async () => {
    vi.mocked(chmodFiles).mockResolvedValueOnce(undefined as any);
    const onDismissed = vi.fn();

    render(
      <Wrapper>
        <ChmodFileModal
          visible
          files={[
            { file: "a.txt", mode: "0644" },
            { file: "b.txt", mode: "0644" },
          ]}
          onDismissed={onDismissed}
        />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Mode");
    expect((input as HTMLInputElement).value).toBe("");

    fireEvent.change(input, { target: { value: "0600" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(chmodFiles).toHaveBeenCalledWith("server-chmod-uuid", "/server", [
        { file: "a.txt", mode: "0600" },
        { file: "b.txt", mode: "0600" },
      ]);
      expect(onDismissed).toHaveBeenCalled();
    });
  });

  it("handles chmod failure and triggers flash error", async () => {
    const error = new Error("Chmod failed");
    vi.mocked(chmodFiles).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <ChmodFileModal
          visible
          files={[{ file: "test.sh", mode: "0755" }]}
          onDismissed={vi.fn()}
        />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith({
        key: "files",
        error,
      });
    });
  });

  it("handles empty files array and single file without initial mode", async () => {
    vi.mocked(chmodFiles).mockResolvedValueOnce(undefined as any);
    const onDismissed = vi.fn();

    const { rerender } = render(
      <Wrapper>
        <ChmodFileModal
          visible
          files={[{ file: "nomode.txt" } as any]}
          onDismissed={onDismissed}
        />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Mode") as HTMLInputElement;
    expect(input.value).toBe("");

    // Now test with empty files array
    rerender(
      <Wrapper>
        <ChmodFileModal visible files={[]} onDismissed={onDismissed} />
      </Wrapper>,
    );
    expect((screen.getByLabelText("File Mode") as HTMLInputElement).value).toBe(
      "",
    );

    fireEvent.change(screen.getByLabelText("File Mode"), {
      target: { value: "0755" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(chmodFiles).toHaveBeenCalledWith(
        "server-chmod-uuid",
        "/server",
        [],
      );
      expect(onDismissed).toHaveBeenCalled();
    });
  });

  it("updates folder mode where isFile is false", async () => {
    vi.mocked(chmodFiles).mockResolvedValueOnce(undefined as any);
    const onDismissed = vi.fn();

    render(
      <Wrapper>
        <ChmodFileModal
          visible
          files={[{ file: "other.sh", mode: "0755" }]}
          onDismissed={onDismissed}
        />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(onDismissed).toHaveBeenCalled();
    });
  });
});
