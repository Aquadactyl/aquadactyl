import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "@/api/http";
import createServerBackup from "./backups/createServerBackup";
import deleteBackup from "./backups/deleteBackup";
import getBackupDownloadUrl from "./backups/getBackupDownloadUrl";
import getServerBackups, { Context } from "./backups/getServerBackups";
import { renderHook } from "@testing-library/react";
import React from "react";

vi.mock("@/api/http");

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({ server: { data: { uuid: "srv-uuid-1" } } }),
  },
}));

let capturedQueryFn: (() => Promise<any>) | null = null;
vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: (_key: any, queryFn: () => Promise<any>) => {
    capturedQueryFn = queryFn;
    return { data: undefined, error: null };
  },
}));

describe("api/server/backups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedQueryFn = null;
  });

  it("createServerBackup posts backup creation request and transforms response", async () => {
    const rawBackup = {
      object: "backup",
      attributes: {
        uuid: "b-1",
        is_successful: true,
        is_locked: false,
        name: "World Backup",
        ignored_files: "*.log",
        checksum: "abc123hash",
        bytes: 1024,
        created_at: "2026-01-01T00:00:00.000Z",
        completed_at: "2026-01-01T00:01:00.000Z",
      },
    };
    vi.mocked(http.post).mockResolvedValueOnce({ data: rawBackup } as any);

    const result = await createServerBackup("srv-uuid-1", {
      name: "World Backup",
      ignored: "*.log",
      isLocked: false,
    });

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-uuid-1/backups",
      {
        name: "World Backup",
        ignored: "*.log",
        is_locked: false,
      },
    );
    expect(result.uuid).toBe("b-1");
    expect(result.name).toBe("World Backup");
  });

  it("deleteBackup calls DELETE on backup endpoint", async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({} as any);

    await deleteBackup("srv-uuid-1", "b-1");

    expect(http.delete).toHaveBeenCalledWith(
      "/api/client/servers/srv-uuid-1/backups/b-1",
    );
  });

  it("deleteBackup rejects if API fails", async () => {
    vi.mocked(http.delete).mockRejectedValueOnce(new Error("Network Error"));

    await expect(deleteBackup("srv-uuid-1", "b-1")).rejects.toThrow(
      "Network Error",
    );
  });

  it("getBackupDownloadUrl retrieves download URL", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        attributes: { url: "https://backups.example.com/download/b-1.tar.gz" },
      },
    } as any);

    const url = await getBackupDownloadUrl("srv-uuid-1", "b-1");

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-uuid-1/backups/b-1/download",
    );
    expect(url).toBe("https://backups.example.com/download/b-1.tar.gz");
  });

  it("getBackupDownloadUrl rejects on error", async () => {
    vi.mocked(http.get).mockRejectedValueOnce(new Error("Failed"));

    await expect(getBackupDownloadUrl("srv-uuid-1", "b-1")).rejects.toThrow(
      "Failed",
    );
  });

  it("getServerBackups query hook fetches paginated backups", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        Context.Provider,
        { value: { page: 2, setPage: vi.fn() } },
        children,
      );

    renderHook(() => getServerBackups(), { wrapper });

    expect(capturedQueryFn).not.toBeNull();

    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            attributes: {
              uuid: "b-2",
              is_successful: true,
              is_locked: true,
              name: "Nightly Backup",
              ignored_files: "",
              checksum: "hash2",
              bytes: 2048,
              created_at: "2026-01-02T00:00:00.000Z",
              completed_at: "2026-01-02T00:02:00.000Z",
            },
          },
        ],
        meta: {
          pagination: {
            current_page: 2,
            total_pages: 5,
            total: 50,
            per_page: 10,
            count: 1,
          },
          backup_count: 50,
        },
      },
    } as any);

    const data = await capturedQueryFn!();

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-uuid-1/backups",
      {
        params: { page: 2 },
      },
    );
    expect(data.items).toHaveLength(1);
    expect(data.items[0].uuid).toBe("b-2");
    expect(data.backupCount).toBe(50);
  });
});
