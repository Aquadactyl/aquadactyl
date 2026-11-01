import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "@/api/http";
import { queryClient } from "@/lib/queryClient";
import {
  moveFilesToTrash,
  getTrash,
  restoreTrashItem,
  deleteTrashItem,
} from "./trash";

vi.mock("@/api/http");
vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

describe("api/server/files/trash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("moveFilesToTrash", () => {
    it("posts files to trash and invalidates queries on success", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({} as any);

      await moveFilesToTrash("server-1", "/home", ["file1.txt", "file2.txt"]);

      expect(http.post).toHaveBeenCalledWith(
        "/api/client/servers/server-1/trash",
        {
          root: "/home",
          files: ["file1.txt", "file2.txt"],
        },
      );
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["server-1", "trash"],
      });
    });

    it("invalidates queries even if request fails", async () => {
      vi.mocked(http.post).mockRejectedValueOnce(new Error("Failed"));

      await expect(
        moveFilesToTrash("server-1", "/home", ["file1.txt"]),
      ).rejects.toThrow("Failed");

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["server-1", "trash"],
      });
    });
  });

  describe("getTrash", () => {
    it("gets trash with default page", async () => {
      const mockData = {
        data: [],
        meta: { current_page: 1, last_page: 1, total: 0 },
      };
      vi.mocked(http.get).mockResolvedValueOnce({ data: mockData } as any);

      const result = await getTrash("server-1");
      expect(http.get).toHaveBeenCalledWith(
        "/api/client/servers/server-1/trash",
        {
          params: { page: 1 },
        },
      );
      expect(result).toEqual(mockData);
    });

    it("gets trash with explicit page", async () => {
      const mockData = {
        data: [],
        meta: { current_page: 3, last_page: 5, total: 50 },
      };
      vi.mocked(http.get).mockResolvedValueOnce({ data: mockData } as any);

      const result = await getTrash("server-1", 3);
      expect(http.get).toHaveBeenCalledWith(
        "/api/client/servers/server-1/trash",
        {
          params: { page: 3 },
        },
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("restoreTrashItem", () => {
    it("posts to restore endpoint", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({} as any);

      await restoreTrashItem("server-1", "item-99");
      expect(http.post).toHaveBeenCalledWith(
        "/api/client/servers/server-1/trash/item-99/restore",
      );
    });
  });

  describe("deleteTrashItem", () => {
    it("deletes trash item", async () => {
      vi.mocked(http.delete).mockResolvedValueOnce({} as any);

      await deleteTrashItem("server-1", "item-99");
      expect(http.delete).toHaveBeenCalledWith(
        "/api/client/servers/server-1/trash/item-99",
      );
    });
  });
});
