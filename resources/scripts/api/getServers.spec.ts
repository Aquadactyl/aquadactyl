import { describe, expect, it, vi } from "vitest";
import http, { getPaginationSet } from "@/api/http";
import getServers from "./getServers";
import getSystemPermissions from "./getSystemPermissions";

vi.mock("@/api/http");

describe("api/getServers and getSystemPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPaginationSet).mockImplementation((data: any) => ({
      total: data.total,
      count: data.count,
      perPage: data.per_page,
      currentPage: data.current_page,
      totalPages: data.total_pages,
    }));
  });

  describe("getServers", () => {
    it("fetches servers list with query parameters and paginates result", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          data: [
            {
              attributes: {
                identifier: "srv-1",
                server_identifier: "s-1",
                internal_id: 1,
                uuid: "srv-uuid-1",
                name: "Server One",
                folder_id: 7,
                node: "Node 1",
                user_permissions: [],
                status: "running",
                invocation: "run",
                docker_image: "img",
                sftp_details: { ip: "127.0.0.1", port: 2022 },
                description: null,
                limits: { memory: 512, swap: 0, disk: 1024, io: 500, cpu: 100 },
                egg_features: [],
                feature_limits: { databases: 1, allocations: 1, backups: 1 },
                is_transferring: false,
                skip_scripts: false,
                BlueprintFramework: { egg_id: 1 },
              },
            },
          ],
          meta: {
            pagination: {
              total: 1,
              count: 1,
              per_page: 10,
              current_page: 1,
              total_pages: 1,
            },
          },
        },
      } as any);

      const result = await getServers({ query: "minecraft", page: 1 });

      expect(http.get).toHaveBeenCalledWith("/api/client", {
        params: {
          "filter[*]": "minecraft",
          page: 1,
        },
      });
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe("Server One");
      expect(result.items[0].folderId).toBe(7);
      expect(result.pagination.total).toBe(1);
    });

    it("handles missing data.data array and falls back to empty array", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          meta: {
            pagination: {
              total: 0,
              count: 0,
              per_page: 10,
              current_page: 1,
              total_pages: 0,
            },
          },
        },
      } as any);

      const result = await getServers({});
      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("rejects when http.get fails", async () => {
      vi.mocked(http.get).mockRejectedValueOnce(new Error("Network Error"));
      await expect(getServers({})).rejects.toThrow("Network Error");
    });
  });

  describe("getSystemPermissions", () => {
    it("fetches system permissions map", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          attributes: {
            permissions: {
              control: {
                description: "Control server",
                keys: { start: "Start", stop: "Stop" },
              },
            },
          },
        },
      } as any);

      const perms = await getSystemPermissions();

      expect(http.get).toHaveBeenCalledWith("/api/client/permissions");
      expect(perms.control.description).toBe("Control server");
    });
  });
});
