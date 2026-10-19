import http from "@/api/http";
import {
  getServerFolders,
  saveServerFolder,
  deleteServerFolder,
  assignServerFolder,
} from "./serverFolders";
vi.mock("@/api/http");
afterEach(() => vi.clearAllMocks());
it("loads personal folders", async () => {
  vi.mocked(http.get).mockResolvedValue({
    data: { data: [{ id: 1, name: "Games" }] },
  });
  expect(await getServerFolders()).toEqual([{ id: 1, name: "Games" }]);
  expect(http.get).toHaveBeenCalledWith("/api/client/account/server-folders");
});
it("creates renames deletes and clears server folders", async () => {
  await saveServerFolder("Games");
  expect(http.post).toHaveBeenCalledWith("/api/client/account/server-folders", {
    name: "Games",
  });
  await saveServerFolder("Updated", 1);
  expect(http.put).toHaveBeenCalledWith(
    "/api/client/account/server-folders/1",
    { name: "Updated" },
  );
  await deleteServerFolder(1);
  expect(http.delete).toHaveBeenCalledWith(
    "/api/client/account/server-folders/1",
  );
  await assignServerFolder("uuid", 1);
  expect(http.put).toHaveBeenCalledWith(
    "/api/client/account/server-folders/servers/uuid",
    { folder_id: 1 },
  );
  await assignServerFolder("uuid", null);
  expect(http.put).toHaveBeenLastCalledWith(
    "/api/client/account/server-folders/servers/uuid",
    { folder_id: null },
  );
});
it("propagates request failures", async () => {
  vi.mocked(http.post).mockRejectedValueOnce(new Error("Failed"));
  await expect(saveServerFolder("Games")).rejects.toThrow("Failed");
});
