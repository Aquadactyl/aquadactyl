import { describe, expect, it, vi } from "vitest";
import http from "@/api/http";
import getApiKeys, { rawDataToApiKey } from "./getApiKeys";
import createApiKey from "./createApiKey";
import deleteApiKey from "./deleteApiKey";

vi.mock("@/api/http");

describe("api/account/api-keys", () => {
  describe("rawDataToApiKey", () => {
    it("transforms raw api key data into ApiKey object", () => {
      const raw = {
        identifier: "test-id",
        description: "CLI Key",
        allowed_ips: ["127.0.0.1"],
        created_at: "2026-01-01T00:00:00Z",
        last_used_at: null,
      };

      const result = rawDataToApiKey(raw);
      expect(result.identifier).toBe("test-id");
      expect(result.description).toBe("CLI Key");
      expect(result.allowedIps).toEqual(["127.0.0.1"]);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.lastUsedAt).toBeNull();

      const nullDates = rawDataToApiKey({
        ...raw,
        created_at: null,
      });
      expect(nullDates.createdAt).toBeNull();
    });
  });

  describe("getApiKeys", () => {
    it("fetches and maps api keys list", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          data: [
            {
              attributes: {
                identifier: "k1",
                description: "Test 1",
                allowed_ips: [],
                created_at: "2026-01-01T00:00:00Z",
                last_used_at: "2026-01-02T00:00:00Z",
              },
            },
          ],
        },
      } as any);

      const keys = await getApiKeys();
      expect(http.get).toHaveBeenCalledWith("/api/client/account/api-keys");
      expect(keys).toHaveLength(1);
      expect(keys[0].identifier).toBe("k1");
      expect(keys[0].lastUsedAt).toBeInstanceOf(Date);
    });

    it("handles missing data.data and falls back to empty array", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {},
      } as any);

      const keys = await getApiKeys();
      expect(keys).toEqual([]);
    });

    it("rejects when http.get fails", async () => {
      vi.mocked(http.get).mockRejectedValueOnce(new Error("API Error"));
      await expect(getApiKeys()).rejects.toThrow("API Error");
    });
  });

  describe("createApiKey", () => {
    it("posts description and split allowed IPs and returns key with secretToken", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {
          attributes: {
            identifier: "new-key",
            description: "New Key",
            allowed_ips: ["10.0.0.1", "10.0.0.2"],
            created_at: "2026-01-01T00:00:00Z",
            last_used_at: null,
          },
          meta: {
            secret_token: "ptlc_secret123",
          },
        },
      } as any);

      const key = await createApiKey("New Key", "10.0.0.1\n10.0.0.2");
      expect(http.post).toHaveBeenCalledWith("/api/client/account/api-keys", {
        description: "New Key",
        allowed_ips: ["10.0.0.1", "10.0.0.2"],
      });
      expect(key.identifier).toBe("new-key");
      expect(key.secretToken).toBe("ptlc_secret123");
    });

    it("handles empty allowed IPs string", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {
          attributes: {
            identifier: "key-no-ips",
            description: "No IPs",
            allowed_ips: [],
            created_at: null,
            last_used_at: null,
          },
        },
      } as any);

      const key = await createApiKey("No IPs", "");
      expect(http.post).toHaveBeenCalledWith("/api/client/account/api-keys", {
        description: "No IPs",
        allowed_ips: [],
      });
      expect(key.secretToken).toBe("");
    });
  });

  describe("deleteApiKey", () => {
    it("calls delete endpoint with key identifier", async () => {
      vi.mocked(http.delete).mockResolvedValueOnce({} as any);

      await deleteApiKey("key-to-delete");
      expect(http.delete).toHaveBeenCalledWith(
        "/api/client/account/api-keys/key-to-delete",
      );
    });
  });
});
