import { describe, expect, it, vi } from "vitest";
import getGameQuery from "./getGameQuery";
import http from "@/api/http";

vi.mock("@/api/http");

describe("api/server/getGameQuery", () => {
  it("fetches game query with valid date", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        attributes: {
          status: "available",
          players: 10,
          max_players: 50,
          checked_at: "2026-10-12T12:00:00Z",
        },
      },
    } as any);

    const res = await getGameQuery("srv-123");
    expect(http.get).toHaveBeenCalledWith("/api/client/servers/srv-123/query");
    expect(res).toEqual({
      status: "available",
      players: 10,
      maxPlayers: 50,
      checkedAt: new Date("2026-10-12T12:00:00Z"),
    });
  });

  it("fetches game query with null checked_at", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        attributes: {
          status: "pending",
          players: null,
          max_players: null,
          checked_at: null,
        },
      },
    } as any);

    const res = await getGameQuery("srv-456");
    expect(res.checkedAt).toBeNull();
    expect(res.status).toBe("pending");
  });
});
