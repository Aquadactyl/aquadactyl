import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "@/api/http";
import createServerDatabase from "./databases/createServerDatabase";
import deleteServerDatabase from "./databases/deleteServerDatabase";
import getServerDatabases, {
  rawDataToServerDatabase,
} from "./databases/getServerDatabases";
import rotateDatabasePassword from "./databases/rotateDatabasePassword";

vi.mock("@/api/http");

describe("api/server/databases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDbRaw = {
    id: "db_1",
    name: "s1_main",
    username: "u1_user",
    host: { address: "127.0.0.1", port: 3306 },
    connections_from: "%",
    relationships: {
      password: {
        attributes: { password: "secret_db_pass" },
      },
    },
  };

  it("rawDataToServerDatabase transforms raw database attributes", () => {
    const db = rawDataToServerDatabase(mockDbRaw);
    expect(db.id).toBe("db_1");
    expect(db.name).toBe("s1_main");
    expect(db.username).toBe("u1_user");
    expect(db.connectionString).toBe("127.0.0.1:3306");
    expect(db.allowConnectionsFrom).toBe("%");
    expect(db.password).toBe("secret_db_pass");
  });

  it("rawDataToServerDatabase handles missing relationships gracefully", () => {
    const db = rawDataToServerDatabase({
      ...mockDbRaw,
      relationships: {},
    });
    expect(db.password).toBeUndefined();
  });

  it("createServerDatabase posts database creation with include password", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: { attributes: mockDbRaw },
    } as any);

    const result = await createServerDatabase("srv-1", {
      databaseName: "s1_main",
      connectionsFrom: "%",
    });

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/databases",
      { database: "s1_main", remote: "%" },
      { params: { include: "password" } },
    );
    expect(result.id).toBe("db_1");
    expect(result.password).toBe("secret_db_pass");
  });

  it("createServerDatabase handles errors", async () => {
    vi.mocked(http.post).mockRejectedValueOnce(
      new Error("Database limit reached"),
    );

    await expect(
      createServerDatabase("srv-1", {
        databaseName: "db2",
        connectionsFrom: "%",
      }),
    ).rejects.toThrow("Database limit reached");
  });

  it("deleteServerDatabase sends DELETE request", async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({} as any);

    await deleteServerDatabase("srv-1", "db_1");

    expect(http.delete).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/databases/db_1",
    );
  });

  it("deleteServerDatabase handles errors", async () => {
    vi.mocked(http.delete).mockRejectedValueOnce(new Error("Cannot delete"));

    await expect(deleteServerDatabase("srv-1", "db_1")).rejects.toThrow(
      "Cannot delete",
    );
  });

  it("getServerDatabases fetches databases with include password by default", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        data: [{ attributes: mockDbRaw }],
      },
    } as any);

    const result = await getServerDatabases("srv-1");

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/databases",
      {
        params: { include: "password" },
      },
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("db_1");
  });

  it("getServerDatabases fetches databases without include password when set to false", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: { data: [] },
    } as any);

    const result = await getServerDatabases("srv-1", false);

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/databases",
      {
        params: undefined,
      },
    );
    expect(result).toHaveLength(0);
  });

  it("getServerDatabases handles empty data array", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {},
    } as any);

    const result = await getServerDatabases("srv-1");
    expect(result).toEqual([]);
  });

  it("rotateDatabasePassword posts password rotation request", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: {
        attributes: {
          ...mockDbRaw,
          relationships: { password: { attributes: { password: "new_pass" } } },
        },
      },
    } as any);

    const result = await rotateDatabasePassword("srv-1", "db_1");

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/databases/db_1/rotate-password",
    );
    expect(result.password).toBe("new_pass");
  });

  it("rotateDatabasePassword handles errors", async () => {
    vi.mocked(http.post).mockRejectedValueOnce(new Error("Rotation failed"));

    await expect(rotateDatabasePassword("srv-1", "db_1")).rejects.toThrow(
      "Rotation failed",
    );
  });
});
