import { describe, expect, it } from "vitest";
import {
  rawDataToServerAllocation,
  rawDataToFileObject,
  rawDataToServerBackup,
  rawDataToServerEggVariable,
} from "./transformers";

describe("api/transformers", () => {
  describe("rawDataToServerAllocation", () => {
    it("transforms raw fractal allocation data", () => {
      const raw = {
        object: "allocation",
        attributes: {
          id: 42,
          ip: "127.0.0.1",
          ip_alias: "game.example.com",
          port: 25565,
          notes: "Primary allocation",
          is_default: true,
        },
      };

      const result = rawDataToServerAllocation(raw);
      expect(result).toEqual({
        id: 42,
        ip: "127.0.0.1",
        alias: "game.example.com",
        port: 25565,
        notes: "Primary allocation",
        isDefault: true,
      });
    });
  });

  describe("rawDataToFileObject", () => {
    it("transforms file data and evaluates isArchiveType and isEditable correctly", () => {
      const fileRaw = {
        object: "file_object",
        attributes: {
          name: "server.properties",
          mode: "-rw-r--r--",
          mode_bits: "644",
          size: 1024,
          is_file: true,
          is_symlink: false,
          mimetype: "text/plain",
          created_at: "2026-01-01T00:00:00Z",
          modified_at: "2026-01-02T00:00:00Z",
        },
      };

      const fileObj = rawDataToFileObject(fileRaw);
      expect(fileObj.key).toBe("file_server.properties");
      expect(fileObj.name).toBe("server.properties");
      expect(fileObj.isFile).toBe(true);
      expect(fileObj.isArchiveType()).toBe(false);
      expect(fileObj.isEditable()).toBe(true);
    });

    it("identifies archive mime types and marks them as non-editable", () => {
      const zipRaw = {
        object: "file_object",
        attributes: {
          name: "backup.zip",
          mode: "-rw-r--r--",
          mode_bits: "644",
          size: 50000,
          is_file: true,
          is_symlink: false,
          mimetype: "application/zip",
          created_at: "2026-01-01T00:00:00Z",
          modified_at: "2026-01-02T00:00:00Z",
        },
      };

      const zipObj = rawDataToFileObject(zipRaw);
      expect(zipObj.isArchiveType()).toBe(true);
      expect(zipObj.isEditable()).toBe(false);
    });

    it("marks directory as non-archive and non-editable", () => {
      const dirRaw = {
        object: "file_object",
        attributes: {
          name: "plugins",
          mode: "drwxr-xr-x",
          mode_bits: "755",
          size: 4096,
          is_file: false,
          is_symlink: false,
          mimetype: "inode/directory",
          created_at: "2026-01-01T00:00:00Z",
          modified_at: "2026-01-02T00:00:00Z",
        },
      };

      const dirObj = rawDataToFileObject(dirRaw);
      expect(dirObj.key).toBe("dir_plugins");
      expect(dirObj.isFile).toBe(false);
      expect(dirObj.isArchiveType()).toBe(false);
      expect(dirObj.isEditable()).toBe(false);
    });

    it("marks binary/image non-svg files as non-editable", () => {
      const imgRaw = {
        object: "file_object",
        attributes: {
          name: "icon.png",
          mode: "-rw-r--r--",
          mode_bits: "644",
          size: 2048,
          is_file: true,
          is_symlink: false,
          mimetype: "image/png",
          created_at: "2026-01-01T00:00:00Z",
          modified_at: "2026-01-02T00:00:00Z",
        },
      };

      const imgObj = rawDataToFileObject(imgRaw);
      expect(imgObj.isEditable()).toBe(false);
    });
  });

  describe("rawDataToServerBackup", () => {
    it("transforms backup attributes", () => {
      const raw = {
        object: "backup",
        attributes: {
          uuid: "backup-123",
          is_successful: true,
          is_locked: false,
          name: "Nightly Backup",
          ignored_files: ["logs/*"],
          checksum: "sha256abc",
          bytes: 1234567,
          created_at: "2026-01-01T00:00:00Z",
          completed_at: "2026-01-01T00:05:00Z",
        },
      };

      const backup = rawDataToServerBackup(raw);
      expect(backup.uuid).toBe("backup-123");
      expect(backup.isSuccessful).toBe(true);
      expect(backup.isLocked).toBe(false);
      expect(backup.name).toBe("Nightly Backup");
      expect(backup.ignoredFiles).toEqual(["logs/*"]);
      expect(backup.completedAt).toBeInstanceOf(Date);
    });

    it("handles null completedAt", () => {
      const raw = {
        object: "backup",
        attributes: {
          uuid: "backup-pending",
          is_successful: false,
          is_locked: true,
          name: "Pending Backup",
          ignored_files: [],
          checksum: null,
          bytes: 0,
          created_at: "2026-01-01T00:00:00Z",
          completed_at: null,
        },
      };

      const backup = rawDataToServerBackup(raw);
      expect(backup.completedAt).toBeNull();
    });
  });

  describe("rawDataToServerEggVariable", () => {
    it("transforms server egg variable attributes and splits rules", () => {
      const raw = {
        object: "egg_variable",
        attributes: {
          name: "Server Version",
          description: "Minecraft server version",
          env_variable: "SERVER_VERSION",
          default_value: "latest",
          server_value: "1.20.4",
          is_editable: true,
          rules: "required|string|max:20",
        },
      };

      const eggVar = rawDataToServerEggVariable(raw);
      expect(eggVar.name).toBe("Server Version");
      expect(eggVar.envVariable).toBe("SERVER_VERSION");
      expect(eggVar.defaultValue).toBe("latest");
      expect(eggVar.serverValue).toBe("1.20.4");
      expect(eggVar.isEditable).toBe(true);
      expect(eggVar.rules).toEqual(["required", "string", "max:20"]);
    });
  });
});
