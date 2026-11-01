import { describe, expect, it, vi, beforeEach } from "vitest";
import http from "@/api/http";
import getServer, { rawDataToServerObject } from "./getServer";

vi.mock("@/api/http");

const baseServerData: any = {
  attributes: {
    identifier: "srv-id-1",
    server_identifier: "s-1",
    internal_id: 1,
    uuid: "uuid-1234",
    name: "Test Server",
    node: "Node 1",
    node_country: "US",
    node_country_name: "United States",
    upload_limit: 2 * 1024 * 1024 * 1024,
    user_permissions: ["control.start"],
    game_query_type: "minecraft",
    is_node_under_maintenance: false,
    status: "running",
    invocation: "java -jar server.jar",
    docker_image: "ghcr.io/pterodactyl/yolks:java_17",
    sftp_details: {
      ip: "127.0.0.1",
      port: 2022,
    },
    description: "My Server Description",
    limits: {
      memory: 1024,
      swap: 0,
      disk: 5120,
      io: 500,
      cpu: 200,
      threads: "1,2",
    },
    egg_features: ["eula"],
    feature_limits: {
      databases: 2,
      allocations: 3,
      backups: 1,
    },
    is_transferring: false,
    skip_scripts: false,
    BlueprintFramework: {
      egg_id: 5,
    },
    relationships: {
      variables: {
        object: "list",
        data: [
          {
            object: "egg_variable",
            attributes: {
              name: "Server Jar",
              description: "The jar file",
              env_variable: "SERVER_JARFILE",
              default_value: "server.jar",
              server_value: "paper.jar",
              is_editable: true,
              rules: "required|string",
            },
          },
        ],
      },
      allocations: {
        object: "list",
        data: [
          {
            object: "server_allocation",
            attributes: {
              id: 1,
              ip: "192.168.1.1",
              alias: null,
              port: 25565,
              notes: null,
              is_default: true,
            },
          },
        ],
      },
    },
  },
};

describe("api/server/getServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rawDataToServerObject", () => {
    it("transforms raw fractal response data to Server model with full fields", () => {
      const server = rawDataToServerObject(baseServerData);

      expect(server.id).toBe("srv-id-1");
      expect(server.identifier).toBe("s-1");
      expect(server.internalId).toBe(1);
      expect(server.uuid).toBe("uuid-1234");
      expect(server.name).toBe("Test Server");
      expect(server.nodeCountry).toBe("US");
      expect(server.nodeCountryName).toBe("United States");
      expect(server.uploadLimit).toBe(2 * 1024 * 1024 * 1024);
      expect(server.gameQueryType).toBe("minecraft");
      expect(server.description).toBe("My Server Description");
      expect(server.variables).toHaveLength(1);
      expect(server.allocations).toHaveLength(1);
      expect(server.BlueprintFramework.eggId).toBe(5);
    });

    it("handles nullish and fallback fields gracefully", () => {
      const minimalData: any = {
        attributes: {
          ...baseServerData.attributes,
          node_country: undefined,
          node_country_name: undefined,
          user_permissions: undefined,
          game_query_type: undefined,
          description: "",
          egg_features: undefined,
          relationships: undefined,
        },
      };

      const server = rawDataToServerObject(minimalData);
      expect(server.nodeCountry).toBeNull();
      expect(server.nodeCountryName).toBeNull();
      expect(server.gameQueryType).toBeNull();
      expect(server.description).toBeNull();
      expect(server.userPermissions).toEqual([]);
      expect(server.eggFeatures).toEqual([]);
      expect(server.variables).toEqual([]);
      expect(server.allocations).toEqual([]);

      const nullDescData: any = {
        attributes: {
          ...baseServerData.attributes,
          description: null,
        },
      };
      expect(rawDataToServerObject(nullDescData).description).toBeNull();
    });
  });

  describe("getServer", () => {
    it("returns server and all permissions when user is server owner", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          ...baseServerData,
          meta: {
            is_server_owner: true,
          },
        },
      } as any);

      const [server, permissions] = await getServer("uuid-1234");
      expect(http.get).toHaveBeenCalledWith("/api/client/servers/uuid-1234");
      expect(server.uuid).toBe("uuid-1234");
      expect(permissions).toEqual(["*"]);
    });

    it("returns server and subuser permissions when not server owner", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          ...baseServerData,
          meta: {
            is_server_owner: false,
            user_permissions: ["control.start", "control.stop"],
          },
        },
      } as any);

      const [server, permissions] = await getServer("uuid-1234");
      expect(server.name).toBe("Test Server");
      expect(permissions).toEqual(["control.start", "control.stop"]);
    });

    it("falls back to empty permissions if user_permissions is omitted", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          ...baseServerData,
          meta: {},
        },
      } as any);

      const [, permissions] = await getServer("uuid-1234");
      expect(permissions).toEqual([]);
    });

    it("rejects when http.get fails", async () => {
      vi.mocked(http.get).mockRejectedValueOnce(new Error("Server not found"));

      await expect(getServer("bad-uuid")).rejects.toThrow("Server not found");
    });
  });
});
