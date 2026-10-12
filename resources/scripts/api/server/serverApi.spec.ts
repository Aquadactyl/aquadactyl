import { describe, expect, it, vi } from "vitest";
import http from "@/api/http";
import getServer, { rawDataToServerObject } from "./getServer";
import sendServerPowerAction from "./sendServerPowerAction";
import setSelectedDockerImage from "./setSelectedDockerImage";
import renameServer from "./renameServer";
import reinstallServer from "./reinstallServer";
import getWebsocketToken from "./getWebsocketToken";
import getServerResourceUsage from "./getServerResourceUsage";
import updateStartupVariable from "./updateStartupVariable";

vi.mock("@/api/http");

const mockServerRawData = {
  attributes: {
    identifier: "server-id-1",
    server_identifier: "s-1",
    internal_id: 1,
    uuid: "server-uuid-1",
    name: "Survival Minecraft",
    node: "Node Alpha",
    node_country: "US",
    node_country_name: "United States",
    user_permissions: ["control.start"],
    game_query_type: "minecraft",
    is_node_under_maintenance: false,
    status: "running",
    invocation: "java -jar server.jar",
    docker_image: "ghcr.io/pterodactyl/yolks:java_17",
    sftp_details: { ip: "127.0.0.1", port: 2022 },
    description: "My Minecraft server",
    limits: {
      memory: 1024,
      swap: 0,
      disk: 2048,
      io: 500,
      cpu: 200,
      threads: "",
    },
    egg_features: ["eula"],
    feature_limits: { databases: 2, allocations: 2, backups: 1 },
    is_transferring: false,
    skip_scripts: false,
    BlueprintFramework: { egg_id: 10 },
    relationships: {
      variables: {
        data: [],
      },
      allocations: {
        data: [],
      },
    },
  },
  meta: {
    is_server_owner: true,
    user_permissions: ["control.start"],
  },
};

describe("api/server/serverApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rawDataToServerObject", () => {
    it("transforms raw fractal response data to Server object", () => {
      const server = rawDataToServerObject(mockServerRawData as any);

      expect(server.id).toBe("server-id-1");
      expect(server.name).toBe("Survival Minecraft");
      expect(server.node).toBe("Node Alpha");
      expect(server.nodeCountry).toBe("US");
      expect(server.limits.memory).toBe(1024);
      expect(server.description).toBe("My Minecraft server");
      expect(server.BlueprintFramework.eggId).toBe(10);
    });

    it("handles empty or null description", () => {
      const copy = {
        attributes: {
          ...mockServerRawData.attributes,
          description: "",
        },
      };
      const server = rawDataToServerObject(copy as any);
      expect(server.description).toBeNull();
    });
  });

  describe("getServer", () => {
    it("fetches server data and user permissions", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: mockServerRawData,
      } as any);

      const [server, permissions] = await getServer("server-uuid-1");

      expect(http.get).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1",
      );
      expect(server.id).toBe("server-id-1");
      expect(permissions).toEqual(["*"]);
    });

    it("returns specific permissions when user is not owner", async () => {
      const subuserData = {
        ...mockServerRawData,
        meta: {
          is_server_owner: false,
          user_permissions: ["control.start", "control.stop"],
        },
      };
      vi.mocked(http.get).mockResolvedValueOnce({
        data: subuserData,
      } as any);

      const [, permissions] = await getServer("server-uuid-1");
      expect(permissions).toEqual(["control.start", "control.stop"]);
    });
  });

  describe("sendServerPowerAction", () => {
    it("posts power action signal", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({} as any);

      await sendServerPowerAction("server-uuid-1", "start");

      expect(http.post).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1/power",
        { signal: "start" },
      );
    });
  });

  describe("setSelectedDockerImage", () => {
    it("puts selected docker image", async () => {
      vi.mocked(http.put).mockResolvedValueOnce({} as any);

      await setSelectedDockerImage("server-uuid-1", "java_21");

      expect(http.put).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1/settings/docker-image",
        { docker_image: "java_21" },
      );
    });
  });

  describe("renameServer", () => {
    it("posts rename request", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({} as any);

      await renameServer("server-uuid-1", "New Server Name", "New Desc");

      expect(http.post).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1/settings/rename",
        { name: "New Server Name", description: "New Desc" },
      );
    });
  });

  describe("reinstallServer", () => {
    it("posts reinstall request", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({} as any);

      await reinstallServer("server-uuid-1");

      expect(http.post).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1/settings/reinstall",
      );
    });
  });

  describe("getWebsocketToken", () => {
    it("fetches websocket token and socket address", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          data: {
            token: "jwt-socket-token",
            socket: "wss://node.example.com:8080",
          },
        },
      } as any);

      const result = await getWebsocketToken("server-uuid-1");

      expect(http.get).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1/websocket",
      );
      expect(result).toEqual({
        token: "jwt-socket-token",
        socket: "wss://node.example.com:8080",
      });
    });
  });

  describe("getServerResourceUsage", () => {
    it("fetches server resource stats", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          attributes: {
            current_state: "running",
            is_suspended: false,
            resources: {
              memory_bytes: 104857600,
              cpu_absolute: 45.5,
              disk_bytes: 524288000,
              network_rx_bytes: 1024,
              network_tx_bytes: 2048,
              uptime: 3600,
            },
          },
        },
      } as any);

      const stats = await getServerResourceUsage("server-uuid-1");

      expect(http.get).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1/resources",
      );
      expect(stats).toEqual({
        status: "running",
        isSuspended: false,
        memoryUsageInBytes: 104857600,
        cpuUsagePercent: 45.5,
        diskUsageInBytes: 524288000,
        networkRxInBytes: 1024,
        networkTxInBytes: 2048,
        uptime: 3600,
      });
    });
  });

  describe("updateStartupVariable", () => {
    it("updates variable and returns variable plus startup command", async () => {
      vi.mocked(http.put).mockResolvedValueOnce({
        data: {
          attributes: {
            name: "Server Jar",
            description: "Jar file",
            env_variable: "SERVER_JARFILE",
            default_value: "server.jar",
            server_value: "custom.jar",
            is_editable: true,
            rules: "required|string",
          },
          meta: {
            startup_command: "java -jar custom.jar",
          },
        },
      } as any);

      const [variable, startupCmd] = await updateStartupVariable(
        "server-uuid-1",
        "SERVER_JARFILE",
        "custom.jar",
      );

      expect(http.put).toHaveBeenCalledWith(
        "/api/client/servers/server-uuid-1/startup/variable",
        { key: "SERVER_JARFILE", value: "custom.jar" },
      );
      expect(variable.serverValue).toBe("custom.jar");
      expect(startupCmd).toBe("java -jar custom.jar");
    });
  });
});
