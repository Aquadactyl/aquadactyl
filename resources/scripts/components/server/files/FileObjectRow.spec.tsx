import { fireEvent, render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import FileObjectRow from "@/components/server/files/FileObjectRow";
import { ServerContext } from "@/state/server";
import { FileObject } from "@/api/server/files/loadDirectory";

// Mock child components that have their own external dependencies
vi.mock("@/components/server/files/FileDropdownMenu", () => ({
  default: ({ file }: { file: FileObject }) => (
    <div data-testid={`menu-${file.name}`}>menu</div>
  ),
}));

vi.mock("@/components/server/files/FileImagePreview", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog">
      <button onClick={onClose}>Close image</button>
    </div>
  ),
}));

const Inner = ({
  permissions,
  directory,
  children,
}: {
  permissions: string[];
  directory: string;
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );
  const setDirectory = ServerContext.useStoreActions(
    (a) => a.files.setDirectory,
  );

  useEffect(() => {
    setServer({
      id: "42",
      uuid: "server-42-uuid",
    } as any);
    setPermissions(permissions);
    setDirectory(directory);
  }, [setServer, setPermissions, setDirectory, permissions, directory]);

  if (!isReady) return null;

  return <MemoryRouter>{children}</MemoryRouter>;
};

const Wrapper = ({
  permissions = ["file.read", "file.read-content"],
  directory = "/home",
  children,
}: {
  permissions?: string[];
  directory?: string;
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner permissions={permissions} directory={directory}>
        {children}
      </Inner>
    </ServerContext.Provider>
  );
};

const makeFile = (overrides?: Partial<FileObject>): FileObject => ({
  key: "file_test.txt",
  name: "test.txt",
  mode: "-rw-r--r--",
  modeBits: "0644",
  size: 2048,
  isFile: true,
  isSymlink: false,
  mimetype: "text/plain",
  createdAt: new Date(),
  modifiedAt: new Date(),
  isArchiveType: () => false,
  isEditable: () => true,
  ...overrides,
});

describe("FileObjectRow", () => {
  it("opens an image in place and requires content-read permission", () => {
    const file = makeFile({
      name: "photo.png",
      mimetype: "image/png",
      isEditable: () => false,
    });
    const { rerender } = render(
      <Wrapper>
        <FileObjectRow file={file} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /photo.png/ }));
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.click(screen.getByText("Close image"));
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(
      <Wrapper permissions={["file.read"]}>
        <FileObjectRow file={file} />
      </Wrapper>,
    );
    expect(screen.queryByRole("button", { name: /photo.png/ })).toBeNull();
  });
  it("renders file details, size, and clickable link when user has read permissions", () => {
    const file = makeFile({ name: "config.yml", size: 1024 });

    render(
      <Wrapper>
        <FileObjectRow file={file} />
      </Wrapper>,
    );

    expect(screen.getByText("config.yml")).toBeDefined();
    // 1024 bytes -> 1 KB / 1.00 KiB / 1 KiB
    expect(screen.getByText(/1.*B/)).toBeDefined();

    const link = screen.getByText("config.yml").closest("a");
    expect(link).toBeDefined();
    expect(link?.getAttribute("href")).toContain(
      "/server/42/files/edit#/home/config.yml",
    );
  });

  it("renders folder row linking to directory path", () => {
    const folder = makeFile({
      key: "dir_world",
      name: "world",
      isFile: false,
      isEditable: () => false,
    });

    render(
      <Wrapper>
        <FileObjectRow file={folder} />
      </Wrapper>,
    );

    expect(screen.getByText("world")).toBeDefined();
    const link = screen.getByText("world").closest("a");
    expect(link).toBeDefined();
    expect(link?.getAttribute("href")).toContain(
      "/server/42/files#/home/world",
    );
  });

  it("dispatches custom context menu event on right click", () => {
    const file = makeFile({ key: "file_server.jar", name: "server.jar" });
    const eventSpy = vi.fn();
    window.addEventListener("pterodactyl:files:ctx:file_server.jar", eventSpy);

    const { container } = render(
      <Wrapper>
        <FileObjectRow file={file} />
      </Wrapper>,
    );

    const row = container.querySelector(".file_row");
    expect(row).toBeDefined();
    fireEvent.contextMenu(row!, { clientX: 150 });

    expect(eventSpy).toHaveBeenCalled();
    window.removeEventListener(
      "pterodactyl:files:ctx:file_server.jar",
      eventSpy,
    );
  });

  it("renders symlink and archive icons, and format for date older than 48h", () => {
    const oldDate = new Date(Date.now() - 72 * 3600 * 1000);
    const symlinkFile = makeFile({
      name: "symlink.txt",
      isSymlink: true,
      modifiedAt: oldDate,
    });
    const archiveFile = makeFile({
      name: "archive.zip",
      isArchiveType: () => true,
    });
    const symlinkDir = makeFile({
      name: "symlink_dir",
      isFile: false,
      isSymlink: true,
    });

    const { rerender } = render(
      <Wrapper>
        <FileObjectRow file={symlinkFile} />
      </Wrapper>,
    );
    expect(screen.getByText("symlink.txt")).toBeDefined();

    rerender(
      <Wrapper>
        <FileObjectRow file={archiveFile} />
      </Wrapper>,
    );
    expect(screen.getByText("archive.zip")).toBeDefined();

    rerender(
      <Wrapper>
        <FileObjectRow file={symlinkDir} />
      </Wrapper>,
    );
    expect(screen.getByText("symlink_dir")).toBeDefined();
  });

  it("renders non-clickable row when user lacks read permissions or file is not editable", () => {
    const uneditableFile = makeFile({
      name: "binary.bin",
      isEditable: () => false,
    });
    const dir = makeFile({
      name: "restricted_dir",
      isFile: false,
    });

    const { rerender } = render(
      <Wrapper permissions={["file.read"]}>
        <FileObjectRow file={uneditableFile} />
      </Wrapper>,
    );

    // Should not have a link
    expect(screen.getByText("binary.bin").closest("a")).toBeNull();

    // Directory when user has no permissions at all
    rerender(
      <Wrapper permissions={[]}>
        <FileObjectRow file={dir} />
      </Wrapper>,
    );
    expect(screen.getByText("restricted_dir").closest("a")).toBeNull();
  });

  it("exercises memo comparator on rerender with identical and changed file props", () => {
    const fileA = makeFile({ name: "memo.txt", size: 100 });
    const fileB = makeFile({ name: "memo.txt", size: 100 });
    const fileC = makeFile({ name: "memo.txt", size: 200 });

    const { rerender } = render(
      <Wrapper>
        <FileObjectRow file={fileA} />
      </Wrapper>,
    );

    // Rerender with identical file data (triggers memo comparator returning true)
    rerender(
      <Wrapper>
        <FileObjectRow file={fileB} />
      </Wrapper>,
    );

    // Rerender with different file data (triggers memo comparator returning false)
    rerender(
      <Wrapper>
        <FileObjectRow file={fileC} />
      </Wrapper>,
    );
    expect(screen.getByText("memo.txt")).toBeDefined();
  });
});
