import { describe, expect, it, vi } from "vitest";
import { restoreServerBackup } from "./index";
import http from "@/api/http";

vi.mock("@/api/http");

describe("api/server/backups/index", () => {
  it("restores backup with truncate flag", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({});

    await restoreServerBackup("server-1", "backup-1", true);
    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/server-1/backups/backup-1/restore",
      { truncate: true },
    );
  });

  it("restores backup without truncate flag", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({});

    await restoreServerBackup("server-1", "backup-2");
    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/server-1/backups/backup-2/restore",
      { truncate: undefined },
    );
  });
});
