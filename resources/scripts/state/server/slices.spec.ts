import { describe, expect, it } from "vitest";
import { createServerStore } from "@/state/server";
import { ServerDatabase } from "@/api/server/databases/getServerDatabases";
import { Subuser } from "@/state/server/subusers";

describe("Server Store Slices", () => {
  describe("Files Slice", () => {
    it("manages directory navigation and clean path sanitization", () => {
      const store = createServerStore();
      expect(store.getState().files.directory).toBe("/");

      store.getState().files.setDirectory("/home/container/plugins");
      expect(store.getState().files.directory).toBe("/home/container/plugins");
    });

    it("manages selected files list", () => {
      const store = createServerStore();
      expect(store.getState().files.selectedFiles).toEqual([]);

      store.getState().files.setSelectedFiles(["file1.txt", "file2.txt"]);
      expect(store.getState().files.selectedFiles).toEqual([
        "file1.txt",
        "file2.txt",
      ]);

      store.getState().files.appendSelectedFile("file3.txt");
      expect(store.getState().files.selectedFiles).toEqual([
        "file1.txt",
        "file2.txt",
        "file3.txt",
      ]);

      // Appending duplicate keeps list unique
      store.getState().files.appendSelectedFile("file2.txt");
      expect(store.getState().files.selectedFiles).toEqual([
        "file1.txt",
        "file3.txt",
        "file2.txt",
      ]);

      store.getState().files.removeSelectedFile("file1.txt");
      expect(store.getState().files.selectedFiles).toEqual([
        "file3.txt",
        "file2.txt",
      ]);
    });

    it("handles file uploads lifecycle and progress", () => {
      const store = createServerStore();
      const abort1 = new AbortController();
      const abort2 = new AbortController();

      store.getState().files.pushFileUpload({
        name: "test1.zip",
        data: { loaded: 0, total: 1000, abort: abort1 },
      });
      store.getState().files.pushFileUpload({
        name: "test2.zip",
        data: { loaded: 100, total: 2000, abort: abort2 },
      });

      expect(store.getState().files.uploads["test1.zip"].loaded).toBe(0);
      expect(store.getState().files.uploads["test2.zip"].loaded).toBe(100);

      store
        .getState()
        .files.setUploadProgress({ name: "test1.zip", loaded: 500 });
      expect(store.getState().files.uploads["test1.zip"].loaded).toBe(500);

      // Progress for non-existent upload is ignored
      store
        .getState()
        .files.setUploadProgress({ name: "missing.zip", loaded: 10 });

      store.getState().files.removeFileUpload("test1.zip");
      expect(store.getState().files.uploads["test1.zip"]).toBeUndefined();

      store.getState().files.cancelFileUpload("test2.zip");
      expect(abort2.signal.aborted).toBe(true);
      expect(store.getState().files.uploads["test2.zip"]).toBeUndefined();

      // Clear uploads aborts all remaining
      const abort3 = new AbortController();
      store.getState().files.pushFileUpload({
        name: "test3.zip",
        data: { loaded: 0, total: 500, abort: abort3 },
      });
      store.getState().files.clearFileUploads();
      expect(abort3.signal.aborted).toBe(true);
      expect(Object.keys(store.getState().files.uploads).length).toBe(0);
    });
  });

  describe("Databases Slice", () => {
    const db1: ServerDatabase = {
      id: "1",
      name: "s1_db1",
      username: "u1_db1",
      connectionString: "1.1.1.1:3306",
      allowConnectionsFrom: "%",
    };
    const db2: ServerDatabase = {
      id: "2",
      name: "s1_db2",
      username: "u1_db2",
      connectionString: "1.1.1.1:3306",
      allowConnectionsFrom: "%",
    };

    it("manages setting, appending, and updating databases", () => {
      const store = createServerStore();
      expect(store.getState().databases.data).toEqual([]);

      store.getState().databases.setDatabases([db1]);
      expect(store.getState().databases.data).toEqual([db1]);

      store.getState().databases.appendDatabase(db2);
      expect(store.getState().databases.data).toEqual([db1, db2]);

      // Appending existing updates it in place
      const updatedDb1 = { ...db1, username: "updated_user" };
      store.getState().databases.appendDatabase(updatedDb1);
      expect(store.getState().databases.data).toEqual([updatedDb1, db2]);

      store.getState().databases.removeDatabase("1");
      expect(store.getState().databases.data).toEqual([db2]);
    });
  });

  describe("Subusers Slice", () => {
    const user1: Subuser = {
      uuid: "u1",
      username: "user1",
      email: "user1@example.com",
      image: "img1",
      twoFactorEnabled: false,
      createdAt: new Date(),
      permissions: [],
      can: () => false,
    };
    const user2: Subuser = {
      uuid: "u2",
      username: "user2",
      email: "user2@example.com",
      image: "img2",
      twoFactorEnabled: true,
      createdAt: new Date(),
      permissions: [],
      can: () => true,
    };

    it("manages setting, appending, updating, and removing subusers", () => {
      const store = createServerStore();
      expect(store.getState().subusers.data).toEqual([]);

      store.getState().subusers.setSubusers([user1]);
      expect(store.getState().subusers.data).toEqual([user1]);

      store.getState().subusers.appendSubuser(user2);
      expect(store.getState().subusers.data).toEqual([user1, user2]);

      // Appending existing user updates it
      const updatedUser1 = { ...user1, username: "new_name" };
      store.getState().subusers.appendSubuser(updatedUser1);
      expect(store.getState().subusers.data).toEqual([updatedUser1, user2]);

      store.getState().subusers.removeSubuser("u1");
      expect(store.getState().subusers.data).toEqual([user2]);
    });
  });

  describe("Schedules Slice", () => {
    const sched1: any = { id: 1, name: "Sched 1", tasks: [] };
    const sched2: any = { id: 2, name: "Sched 2", tasks: [] };

    it("manages schedules operations", () => {
      const store = createServerStore();
      expect(store.getState().schedules.data).toEqual([]);

      store.getState().schedules.setSchedules([sched1]);
      expect(store.getState().schedules.data).toEqual([sched1]);

      store.getState().schedules.appendSchedule(sched2);
      expect(store.getState().schedules.data).toEqual([sched1, sched2]);

      // Appending existing schedule updates it
      const updatedSched1 = { ...sched1, name: "Updated Sched 1" };
      store.getState().schedules.appendSchedule(updatedSched1);
      expect(store.getState().schedules.data).toEqual([updatedSched1, sched2]);

      store.getState().schedules.removeSchedule(1);
      expect(store.getState().schedules.data).toEqual([sched2]);
    });
  });
});
