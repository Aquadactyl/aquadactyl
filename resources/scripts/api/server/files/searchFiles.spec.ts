import { beforeEach, describe, expect, it, vi } from "vitest";
import http from "@/api/http";
import searchFiles from "./searchFiles";

vi.mock("@/api/http");

describe("api/server/files/searchFiles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests recursive Manta search with the selected directory and query", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: ["/config/server.properties", "/world/level.dat"],
    } as any);

    await expect(
      searchFiles("server-uuid", "/world", "level"),
    ).resolves.toEqual(["/config/server.properties", "/world/level.dat"]);
    expect(http.get).toHaveBeenCalledWith(
      "/api/servers/server-uuid/files/search",
      { params: { directory: "/world", query: "level" } },
    );
  });

  it("drops unexpected non-path response values", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: ["/valid", 42, null],
    } as any);

    await expect(searchFiles("server-uuid", "/", "valid")).resolves.toEqual([
      "/valid",
    ]);
  });

  it("returns no results when the response is not an array", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: { paths: [] } } as any);

    await expect(searchFiles("server-uuid", "/", "missing")).resolves.toEqual(
      [],
    );
  });
});
