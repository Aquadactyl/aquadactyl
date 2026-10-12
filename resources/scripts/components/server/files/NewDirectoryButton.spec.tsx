import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { describe, expect, it, vi } from "vitest";
import NewDirectoryButton from "@/components/server/files/NewDirectoryButton";
import { ServerContext } from "@/state/server";
import createDirectory from "@/api/server/files/createDirectory";

vi.mock("@/api/server/files/createDirectory");

let generatedDir: any = null;
const mockMutate = vi.fn().mockImplementation((fn) => {
  if (typeof fn === "function") {
    const res = fn([]);
    generatedDir = res[0];
    return res;
  }
  return Promise.resolve();
});
vi.mock("@/plugins/useFileManagerQuery", () => ({
  default: () => ({
    mutate: mockMutate,
  }),
}));

const mockClearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({
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
      uuid: "server-uuid-123",
    } as any);
    setDirectory("/config");
  }, [setServer, setDirectory]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    // This test verifies directory actions; static motion avoids native animation
    // promises being canceled when happy-dom cleans up the dialog.
    <MotionConfig isStatic>
      <ServerContext.Provider>
        <Inner>{children}</Inner>
      </ServerContext.Provider>
    </MotionConfig>
  );
};

describe("NewDirectoryButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Create Directory button initially", () => {
    render(
      <Wrapper>
        <NewDirectoryButton />
      </Wrapper>,
    );

    expect(
      screen.getByRole("button", { name: "Create Directory" }),
    ).toBeDefined();
  });

  it("opens modal and creates directory successfully on submit", async () => {
    vi.mocked(createDirectory).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper>
        <NewDirectoryButton />
      </Wrapper>,
    );

    // Open dialog
    fireEvent.click(screen.getByRole("button", { name: "Create Directory" }));

    // Modal should now show input field
    const input = screen.getByLabelText("Name");
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: "my-new-folder" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createDirectory).toHaveBeenCalledWith(
        "server-uuid-123",
        "/config",
        "my-new-folder",
      );
      expect(mockMutate).toHaveBeenCalled();
      expect(generatedDir.isArchiveType()).toBe(false);
      expect(generatedDir.isEditable()).toBe(false);
    });
  });

  it("handles directory name resulting in empty split fallback", async () => {
    vi.mocked(createDirectory).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper>
        <NewDirectoryButton />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Directory" }));
    const input = screen.getByLabelText("Name");
    fireEvent.change(input, { target: { value: "/" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createDirectory).toHaveBeenCalledWith(
        "server-uuid-123",
        "/config",
        "/",
      );
      expect(generatedDir.name).toBe("/");
    });
  });

  it("handles API rejection and reports error", async () => {
    const apiError = new Error("Failed to create directory");
    vi.mocked(createDirectory).mockRejectedValueOnce(apiError);

    render(
      <Wrapper>
        <NewDirectoryButton />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Directory" }));

    const input = screen.getByLabelText("Name");
    fireEvent.change(input, { target: { value: "error-folder" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith(apiError);
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  });
});
