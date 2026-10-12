import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import MassActionsBar from "./MassActionsBar";
import { ServerContext } from "@/state/server";
import compressFiles from "@/api/server/files/compressFiles";
import deleteFiles from "@/api/server/files/deleteFiles";
import useFileManagerQuery from "@/plugins/useFileManagerQuery";

vi.mock("@/api/server/files/compressFiles");
vi.mock("@/api/server/files/deleteFiles");
vi.mock("@/plugins/useFileManagerQuery");

vi.mock("@/components/elements/Fade", () => ({
  default: ({ in: show, children }: any) =>
    show ? <div>{children}</div> : null,
}));

vi.mock("@/components/elements/Portal", () => ({
  default: ({ children }: any) => <div>{children}</div>,
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
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="spinner-overlay">{children}</div> : null,
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

const Wrapper = ({
  selectedFiles,
  children,
}: {
  selectedFiles: string[];
  children: React.ReactNode;
}) => {
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
  const setSelectedFiles = ServerContext.useStoreActions(
    (a) => a.files.setSelectedFiles,
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
    setDirectory("/plugins");
    setSelectedFiles(selectedFiles);
  }, [selectedFiles]);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/files/MassActionsBar", () => {
  const mockMutate = vi.fn().mockImplementation((fn) => {
    if (typeof fn === "function") {
      return fn([{ name: "file1.txt" }, { name: "file3.txt" }]);
    }
    return Promise.resolve([]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFileManagerQuery).mockReturnValue({
      mutate: mockMutate,
    } as any);
  });

  it("does not render action buttons when no files are selected", () => {
    render(
      <ServerContext.Provider>
        <Wrapper selectedFiles={[]}>
          <MassActionsBar />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(screen.queryByRole("button", { name: "Move" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("renders Move, Archive, and Delete buttons when files are selected", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper selectedFiles={["file1.txt", "file2.txt"]}>
          <MassActionsBar />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByRole("button", { name: "Move" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Archive" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDefined();
  });

  it("opens move modal when clicking Move button", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper selectedFiles={["file1.txt"]}>
          <MassActionsBar />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const moveBtn = await screen.findByRole("button", { name: "Move" });
    fireEvent.click(moveBtn);

    expect(screen.getByTestId("rename-modal")).toBeDefined();
    expect(screen.getByText("Move Modal")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("rename-modal")).toBeNull();
  });

  it("triggers compressFiles when clicking Archive", async () => {
    vi.mocked(compressFiles).mockResolvedValueOnce({} as any);

    render(
      <ServerContext.Provider>
        <Wrapper selectedFiles={["file1.txt"]}>
          <MassActionsBar />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const archiveBtn = await screen.findByRole("button", { name: "Archive" });
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(compressFiles).toHaveBeenCalledWith("server-uuid-1", "/plugins", [
        "file1.txt",
      ]);
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("opens confirm dialog on Delete and deletes selected files on confirmation", async () => {
    vi.mocked(deleteFiles).mockResolvedValueOnce(undefined as any);

    render(
      <ServerContext.Provider>
        <Wrapper selectedFiles={["file1.txt", "file2.txt"]}>
          <MassActionsBar />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteBtn = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(deleteBtn);

    const dialog = screen.getByTestId("confirm-dialog");
    expect(dialog).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined();

    const confirmBtn = within(dialog).getByRole("button", { name: "Delete" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteFiles).toHaveBeenCalledWith("server-uuid-1", "/plugins", [
        "file1.txt",
        "file2.txt",
      ]);
    });
  });

  it("handles archive failure and sets flash error", async () => {
    const error = new Error("Archive failed");
    vi.mocked(compressFiles).mockRejectedValueOnce(error);

    render(
      <ServerContext.Provider>
        <Wrapper selectedFiles={["file1.txt"]}>
          <MassActionsBar />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const archiveBtn = await screen.findByRole("button", { name: "Archive" });
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(compressFiles).toHaveBeenCalled();
    });
  });

  it("handles delete failure, calls mutate and sets flash error", async () => {
    const error = new Error("Delete failed");
    vi.mocked(deleteFiles).mockRejectedValueOnce(error);

    render(
      <ServerContext.Provider>
        <Wrapper selectedFiles={["file1.txt"]}>
          <MassActionsBar />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteBtn = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(deleteBtn);

    const dialog = screen.getByTestId("confirm-dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: "Delete" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteFiles).toHaveBeenCalled();
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("cancels confirm delete dialog", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper selectedFiles={["file1.txt"]}>
          <MassActionsBar />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteBtn = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(deleteBtn);

    const dialog = screen.getByTestId("confirm-dialog");
    const cancelBtn = within(dialog).getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
  });

  it("renders more than 15 files with 'and X others'", async () => {
    const files = Array.from({ length: 17 }, (_, i) => `file_${i}.txt`);

    render(
      <ServerContext.Provider>
        <Wrapper selectedFiles={files}>
          <MassActionsBar />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteBtn = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(deleteBtn);

    expect(screen.getByText("and 2 others")).toBeDefined();
  });
});
