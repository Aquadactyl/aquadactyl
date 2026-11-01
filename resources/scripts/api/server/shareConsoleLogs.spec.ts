import { describe, it, expect, vi } from "vitest";
import http from "@/api/http";
import shareConsoleLogs from "./shareConsoleLogs";

vi.mock("@/api/http");

describe("api/server/shareConsoleLogs", () => {
  it("posts to console share endpoint and returns url", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: { url: "https://hastebin.com/123" },
    } as any);

    const url = await shareConsoleLogs("server-123", "log output");
    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/server-123/console/share",
      { content: "log output" },
    );
    expect(url).toBe("https://hastebin.com/123");
  });
});
