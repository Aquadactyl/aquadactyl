import { describe, expect, it } from "vitest";
import Transformers from "./transformers";

describe("api/definitions/user/Transformers", () => {
  describe("toSSHKey", () => {
    it("transforms ssh key attributes", () => {
      const raw = {
        name: "Personal Laptop",
        public_key: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5...",
        fingerprint: "SHA256:abcd1234",
        created_at: "2026-01-01T12:00:00Z",
      };

      const key = Transformers.toSSHKey(raw);
      expect(key.name).toBe("Personal Laptop");
      expect(key.publicKey).toBe("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5...");
      expect(key.fingerprint).toBe("SHA256:abcd1234");
      expect(key.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("toUser", () => {
    it("transforms user attributes and attaches can() permission checker", () => {
      const raw = {
        object: "user",
        attributes: {
          uuid: "user-uuid-1",
          username: "adminuser",
          email: "admin@example.com",
          image: "https://gravatar.com/avatar",
          avatar_url: "https://custom.avatar/img.png",
          "2fa_enabled": true,
          permissions: ["control.start", "control.stop"],
          created_at: "2026-01-01T00:00:00Z",
        },
      };

      const user = Transformers.toUser(raw);
      expect(user.uuid).toBe("user-uuid-1");
      expect(user.username).toBe("adminuser");
      expect(user.email).toBe("admin@example.com");
      expect(user.twoFactorEnabled).toBe(true);
      expect(user.avatarUrl).toBe("https://custom.avatar/img.png");
      expect(user.can("control.start" as any)).toBe(true);
      expect(user.can("control.restart" as any)).toBe(false);
    });

    it("handles default fallback values for optional user fields", () => {
      const raw = {
        object: "user",
        attributes: {
          uuid: "user-uuid-2",
          username: "subuser",
          email: "sub@example.com",
          image: "",
          avatar_url: null,
          "2fa_enabled": false,
          created_at: "2026-01-01T00:00:00Z",
        },
      };

      const user = Transformers.toUser(raw as any);
      expect(user.permissions).toEqual([]);
      expect(user.avatarUrl).toBeNull();
      expect(user.can("admin" as any)).toBe(false);
    });
  });

  describe("toActivityLog", () => {
    it("transforms activity log and its actor relationship", () => {
      const raw = {
        object: "activity_log",
        attributes: {
          id: "act-1",
          batch: "batch-1",
          event: "server:power.start",
          ip: "192.168.1.1",
          is_api: false,
          description: "Server started",
          properties: { reason: "manual" },
          has_additional_metadata: true,
          timestamp: "2026-02-01T10:00:00Z",
          relationships: {
            actor: {
              object: "user",
              attributes: {
                uuid: "actor-1",
                username: "actor",
                email: "actor@example.com",
                image: "",
                "2fa_enabled": false,
                permissions: [],
                created_at: "2026-01-01T00:00:00Z",
              },
            },
          },
        },
      };

      const log = Transformers.toActivityLog(raw as any);
      expect(log.id).toBe("act-1");
      expect(log.event).toBe("server:power.start");
      expect(log.hasAdditionalMetadata).toBe(true);
      expect(log.relationships.actor?.username).toBe("actor");
    });
  });
});
