import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "@/api/http";
import createOrUpdateSubuser from "./users/createOrUpdateSubuser";
import deleteSubuser from "./users/deleteSubuser";
import getServerSubusers, {
  rawDataToServerSubuser,
} from "./users/getServerSubusers";

vi.mock("@/api/http");

describe("api/server/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSubuserRaw = {
    object: "server_subuser",
    attributes: {
      uuid: "usr_1",
      username: "subuser1",
      email: "sub@example.com",
      image: "https://gravatar.com/avatar/test",
      "2fa_enabled": true,
      created_at: "2026-01-01T00:00:00.000Z",
      permissions: ["control.start", "control.stop"],
    },
  };

  it("rawDataToServerSubuser properly maps fields and creates working can() method", () => {
    const subuser = rawDataToServerSubuser(mockSubuserRaw as any);
    expect(subuser.uuid).toBe("usr_1");
    expect(subuser.username).toBe("subuser1");
    expect(subuser.email).toBe("sub@example.com");
    expect(subuser.twoFactorEnabled).toBe(true);
    expect(subuser.createdAt).toBeInstanceOf(Date);
    expect(subuser.permissions).toEqual(["control.start", "control.stop"]);
    expect(subuser.can("control.start")).toBe(true);
    expect(subuser.can("control.restart")).toBe(false);
  });

  it("rawDataToServerSubuser handles missing permissions", () => {
    const subuser = rawDataToServerSubuser({
      ...mockSubuserRaw,
      attributes: {
        ...mockSubuserRaw.attributes,
        permissions: null as any,
      },
    } as any);
    expect(subuser.permissions).toEqual([]);
    expect(subuser.can("control.start")).toBe(false);
  });

  it("createOrUpdateSubuser creates a new subuser when subuser is omitted", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: mockSubuserRaw,
    } as any);

    const result = await createOrUpdateSubuser("srv-1", {
      email: "sub@example.com",
      permissions: ["control.start"],
    });

    expect(http.post).toHaveBeenCalledWith("/api/client/servers/srv-1/users", {
      email: "sub@example.com",
      permissions: ["control.start"],
    });
    expect(result.uuid).toBe("usr_1");
  });

  it("createOrUpdateSubuser updates an existing subuser when passed", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: mockSubuserRaw,
    } as any);

    const existingSubuser = rawDataToServerSubuser(mockSubuserRaw as any);
    const result = await createOrUpdateSubuser(
      "srv-1",
      {
        email: "sub@example.com",
        permissions: ["control.start", "control.stop"],
      },
      existingSubuser,
    );

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/users/usr_1",
      {
        email: "sub@example.com",
        permissions: ["control.start", "control.stop"],
      },
    );
    expect(result.uuid).toBe("usr_1");
  });

  it("createOrUpdateSubuser rejects on network error", async () => {
    vi.mocked(http.post).mockRejectedValueOnce(
      new Error("Subuser creation failed"),
    );

    await expect(
      createOrUpdateSubuser("srv-1", {
        email: "fail@example.com",
        permissions: [],
      }),
    ).rejects.toThrow("Subuser creation failed");
  });

  it("deleteSubuser calls DELETE on user endpoint", async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({} as any);

    await deleteSubuser("srv-1", "usr_1");

    expect(http.delete).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/users/usr_1",
    );
  });

  it("deleteSubuser rejects on failure", async () => {
    vi.mocked(http.delete).mockRejectedValueOnce(new Error("Delete failed"));

    await expect(deleteSubuser("srv-1", "usr_1")).rejects.toThrow(
      "Delete failed",
    );
  });

  it("getServerSubusers retrieves list of subusers", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        data: [mockSubuserRaw],
      },
    } as any);

    const subusers = await getServerSubusers("srv-1");

    expect(http.get).toHaveBeenCalledWith("/api/client/servers/srv-1/users");
    expect(subusers).toHaveLength(1);
    expect(subusers[0].uuid).toBe("usr_1");
  });

  it("getServerSubusers returns empty array if data.data is null", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {},
    } as any);

    const subusers = await getServerSubusers("srv-1");
    expect(subusers).toEqual([]);
  });

  it("getServerSubusers rejects on network error", async () => {
    vi.mocked(http.get).mockRejectedValueOnce(new Error("Failed to load"));

    await expect(getServerSubusers("srv-1")).rejects.toThrow("Failed to load");
  });
});
