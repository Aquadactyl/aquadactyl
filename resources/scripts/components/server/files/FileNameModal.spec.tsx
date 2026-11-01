import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import FileNameModal from "@/components/server/files/FileNameModal";
import { ServerContext } from "@/state/server";

const Inner = ({
  directory,
  children,
}: {
  directory: string;
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setDirectory = ServerContext.useStoreActions(
    (a) => a.files.setDirectory,
  );

  useEffect(() => {
    setServer({
      id: "123",
      uuid: "abc-123",
    } as any);
    setDirectory(directory);
  }, [setServer, setDirectory, directory]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  directory = "/plugins",
  children,
}: {
  directory?: string;
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner directory={directory}>{children}</Inner>
    </ServerContext.Provider>
  );
};

describe("FileNameModal", () => {
  it("renders modal form with inputs when visible", () => {
    render(
      <Wrapper>
        <FileNameModal visible onDismissed={vi.fn()} onFileNamed={vi.fn()} />
      </Wrapper>,
    );

    expect(screen.getByLabelText("File Name")).toBeDefined();
    expect(screen.getByRole("button", { name: "Create File" })).toBeDefined();
  });

  it("calls onFileNamed with joined directory and file name on submission", async () => {
    const onFileNamed = vi.fn();
    render(
      <Wrapper directory={"/subfolder"}>
        <FileNameModal
          visible
          onDismissed={vi.fn()}
          onFileNamed={onFileNamed}
        />
      </Wrapper>,
    );

    const input = screen.getByLabelText("File Name");
    fireEvent.change(input, { target: { value: "test.json" } });
    fireEvent.click(screen.getByRole("button", { name: "Create File" }));

    await waitFor(() => {
      expect(onFileNamed).toHaveBeenCalledWith("/subfolder/test.json");
    });
  });

  it("shows validation error when file name is empty", async () => {
    const onFileNamed = vi.fn();
    render(
      <Wrapper>
        <FileNameModal
          visible
          onDismissed={vi.fn()}
          onFileNamed={onFileNamed}
        />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create File" }));

    await waitFor(() => {
      expect(screen.getByText("A file name must be provided.")).toBeDefined();
    });
    expect(onFileNamed).not.toHaveBeenCalled();
  });

  it("calls reset and onDismissed when modal is dismissed", () => {
    const onDismissed = vi.fn();
    render(
      <Wrapper>
        <FileNameModal
          visible
          onDismissed={onDismissed}
          onFileNamed={vi.fn()}
        />
      </Wrapper>,
    );

    const closeBtn = document.querySelector(".close-icon")!;
    fireEvent.click(closeBtn);
    expect(onDismissed).toHaveBeenCalled();
  });
});
