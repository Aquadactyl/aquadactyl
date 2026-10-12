import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import ChmodFileModal from "@/components/server/files/ChmodFileModal";
import { ServerContext } from "@/state/server";
import chmodFiles from "@/api/server/files/chmodFiles";

vi.mock("@/api/server/files/chmodFiles");

const mockMutate = vi.fn();
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
});
