import { describe, expect, it, vi } from "vitest";
import http from "@/api/http";
import chmodFiles from "./files/chmodFiles";
import compressFiles from "./files/compressFiles";
import copyFile from "./files/copyFile";
import createDirectory from "./files/createDirectory";
import decompressFiles from "./files/decompressFiles";
import deleteFiles from "./files/deleteFiles";
import getFileContents from "./files/getFileContents";
import getFileDownloadUrl from "./files/getFileDownloadUrl";
import getFileUploadUrl from "./files/getFileUploadUrl";
import loadDirectory from "./files/loadDirectory";
import renameFiles from "./files/renameFiles";
import saveFileContents from "./files/saveFileContents";

vi.mock("@/api/http");

const rawFileDatum = {
  attributes: {
    name: "server.properties",
    mode: "-rw-r--r--",
    mode_bits: "0644",
    size: 1024,
    is_file: true,
    is_symlink: false,
    mimetype: "text/plain",
    created_at: "2026-01-01T00:00:00Z",
    modified_at: "2026-01-01T00:00:00Z",
  },
};

describe("api/server/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chmodFiles posts mode changes", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    await chmodFiles("srv-1", "/plugins", [
      { file: "config.yml", mode: "0644" },
    ]);

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/chmod",
      {
        root: "/plugins",
        files: [{ file: "config.yml", mode: "0644" }],
      },
    );
  });

  it("compressFiles posts files to compress and returns FileObject", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: rawFileDatum,
    } as any);

    const result = await compressFiles("srv-1", "/", [
      "file1.txt",
      "file2.txt",
    ]);

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/compress",
      { root: "/", files: ["file1.txt", "file2.txt"] },
      expect.any(Object),
    );
    expect(result.name).toBe("server.properties");
    expect(result.isFile).toBe(true);
  });

  it("copyFile posts file copy request", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    await copyFile("srv-1", "config.yml");

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/copy",
      { location: "config.yml" },
    );
  });

  it("createDirectory posts directory creation request", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    await createDirectory("srv-1", "/", "plugins");

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/create-folder",
      { root: "/", name: "plugins" },
    );
  });

  it("decompressFiles posts archive decompression request", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    await decompressFiles("srv-1", "/", "archive.tar.gz");

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/decompress",
      { root: "/", file: "archive.tar.gz" },
      {
        timeout: 300000,
        timeoutErrorMessage:
          "It looks like this archive is taking a long time to be unarchived. Once completed the unarchived files will appear.",
      },
    );
  });

  it("deleteFiles posts files deletion request", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    await deleteFiles("srv-1", "/logs", ["latest.log", "old.log"]);

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/delete",
      { root: "/logs", files: ["latest.log", "old.log"] },
    );
  });

  it("getFileContents gets text file contents", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: "motd=A Minecraft Server",
    } as any);

    const content = await getFileContents("srv-1", "server.properties");

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/contents",
      expect.objectContaining({
        params: { file: "server.properties" },
        responseType: "text",
      }),
    );
    expect(content).toBe("motd=A Minecraft Server");
  });

  it("getFileDownloadUrl gets signed download url", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        attributes: { url: "https://node.example.com/download/file.zip" },
      },
    } as any);

    const url = await getFileDownloadUrl("srv-1", "file.zip");

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/download",
      { params: { file: "file.zip" } },
    );
    expect(url).toBe("https://node.example.com/download/file.zip");
  });

  it("getFileUploadUrl gets signed upload url", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: { attributes: { url: "https://node.example.com/upload" } },
    } as any);

    const url = await getFileUploadUrl("srv-1");

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/upload",
    );
    expect(url).toBe("https://node.example.com/upload");
  });

  it("loadDirectory gets directory contents and maps to FileObject array", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: { data: [rawFileDatum] },
    } as any);

    const files = await loadDirectory("srv-1", "/");

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/list",
      { params: { directory: "/" } },
    );
    expect(files.length).toBe(1);
    expect(files[0].name).toBe("server.properties");
    expect(files[0].size).toBe(1024);
  });

  it("renameFiles posts rename array", async () => {
    vi.mocked(http.put).mockResolvedValueOnce({} as any);

    await renameFiles("srv-1", "/", [{ from: "old.txt", to: "new.txt" }]);

    expect(http.put).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/rename",
      { root: "/", files: [{ from: "old.txt", to: "new.txt" }] },
    );
  });

  it("saveFileContents posts text content with text/plain header", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    await saveFileContents("srv-1", "server.properties", "difficulty=hard");

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/files/write",
      "difficulty=hard",
      {
        params: { file: "server.properties" },
        headers: { "Content-Type": "text/plain" },
      },
    );
  });
});
