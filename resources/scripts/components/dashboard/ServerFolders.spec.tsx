import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import ServerFolderBar from "./ServerFolderBar";
import ServerFolderSelect from "./ServerFolderSelect";
import ServerRow from "./ServerRow";
import { Server } from "@/api/server/getServer";
import {
  saveServerFolder,
  deleteServerFolder,
  assignServerFolder,
} from "@/api/serverFolders";

vi.mock("@/api/serverFolders", () => ({
  saveServerFolder: vi.fn(),
  deleteServerFolder: vi.fn(),
  assignServerFolder: vi.fn(),
}));
vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({
    t: (_key: string, fallback: string, values?: any) =>
      fallback.replace("{{name}}", values?.name),
  }),
}));
vi.mock("./ServerPlayerCount", () => ({ default: () => null }));
vi.mock("@/api/server/getServerResourceUsage", () => ({
  default: vi.fn().mockResolvedValue({
    status: "running",
    cpuUsagePercent: 1,
    memoryUsageInBytes: 1,
    diskUsageInBytes: 1,
  }),
}));

const folders = [
  { id: 1, name: "Minecraft" },
  { id: 2, name: "Other games" },
];
const onSelect = vi.fn();
const onChange = vi.fn().mockResolvedValue(undefined);
beforeEach(() => vi.clearAllMocks());

const bar = (active = "all") =>
  render(
    <ServerFolderBar
      folders={folders}
      active={active}
      onSelect={onSelect}
      onChange={onChange}
    />,
  );
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const dialog = () => within(screen.getByRole("dialog"));

it("filters folders and allows cancelling a new folder", async () => {
  bar();
  click("All servers");
  click("Unfiled");
  click("Minecraft");
  expect(onSelect.mock.calls.map(([value]) => value)).toEqual([
    "all",
    "unfiled",
    "1",
  ]);
  click("New folder");
  expect(dialog().getByRole("button", { name: "Save" })).toHaveProperty(
    "disabled",
    true,
  );
  click("Cancel");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("creates trimmed folder names and keeps a pending dialog open", async () => {
  let resolve!: () => void;
  vi.mocked(saveServerFolder).mockReturnValueOnce(
    new Promise<void>((done) => {
      resolve = done;
    }),
  );
  bar();
  click("New folder");
  fireEvent.change(screen.getByLabelText("Folder name"), {
    target: { value: "  Survival  " },
  });
  click("Save");
  await waitFor(() =>
    expect(saveServerFolder).toHaveBeenCalledWith("Survival", undefined),
  );
  expect(screen.getByRole("button", { name: "Saving..." })).toHaveProperty(
    "disabled",
    true,
  );
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  fireEvent.click(document.querySelector(".dialog_close_icon")!);
  expect(screen.getByRole("dialog")).toBeDefined();
  await act(async () => resolve());
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(onChange).toHaveBeenCalled();
});

it("renames the selected folder", async () => {
  bar("1");
  click("Rename folder");
  expect(screen.getByLabelText("Folder name")).toHaveProperty(
    "value",
    "Minecraft",
  );
  fireEvent.change(screen.getByLabelText("Folder name"), {
    target: { value: "Production" },
  });
  click("Save");
  await waitFor(() =>
    expect(saveServerFolder).toHaveBeenCalledWith("Production", 1),
  );
});

it("deletes only a folder after confirmation and resets the filter", async () => {
  bar("1");
  click("Delete folder");
  expect(screen.getByText(/Only the folder is removed/)).toBeDefined();
  fireEvent.click(dialog().getByRole("button", { name: "Delete folder" }));
  await waitFor(() => expect(deleteServerFolder).toHaveBeenCalledWith(1));
  expect(onSelect).toHaveBeenCalledWith("all");
});

it("shows saving errors and closes on Escape when idle", async () => {
  vi.mocked(saveServerFolder).mockRejectedValueOnce(
    new Error("Duplicate folder"),
  );
  bar();
  click("New folder");
  fireEvent.change(screen.getByLabelText("Folder name"), {
    target: { value: "Minecraft" },
  });
  click("Save");
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Duplicate folder"),
  );
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

const server = {
  uuid: "uuid-folder",
  id: "serv_folder",
  name: "Survival",
  node: "Local",
  folderId: 1,
  status: null,
  allocations: [],
  limits: { cpu: 100, memory: 1024, disk: 1024 },
  userPermissions: [],
} as unknown as Server;
const move = (element: React.ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, invalidate };
};
it("moves a server and removes it from its folder", async () => {
  const { invalidate } = move(
    <ServerFolderSelect server={server} folders={folders} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Folder for Survival" }));
  fireEvent.click(
    await screen.findByRole("menuitemradio", { name: "Other games" }),
  );
  await waitFor(() =>
    expect(assignServerFolder).toHaveBeenCalledWith(server.uuid, 2),
  );
  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["/api/client/servers"],
    }),
  );
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Folder for Survival" }));
  fireEvent.click(
    await screen.findByRole("menuitemradio", { name: "Unfiled" }),
  );
  await waitFor(() =>
    expect(assignServerFolder).toHaveBeenLastCalledWith(server.uuid, null),
  );
});
it("shows assignment failures without losing the current folder", async () => {
  vi.mocked(assignServerFolder).mockRejectedValueOnce(
    new Error("Access changed"),
  );
  move(<ServerFolderSelect server={server} folders={folders} />);
  fireEvent.click(screen.getByRole("button", { name: "Folder for Survival" }));
  fireEvent.click(
    await screen.findByRole("menuitemradio", { name: "Other games" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Access changed"),
  );
  expect(
    screen.getByRole("button", { name: "Folder for Survival" }).textContent,
  ).toContain("Minecraft");
});
it("offers folder assignment on server rows including unfiled servers", async () => {
  move(<ServerRow server={{ ...server, folderId: null }} folders={folders} />);
  expect(
    screen.getByRole("button", { name: "Folder for Survival" }).textContent,
  ).toContain("Add to folder");
  fireEvent.click(screen.getByRole("button", { name: "Folder for Survival" }));
  expect(
    (
      await screen.findByRole("menuitemradio", { name: "Unfiled" })
    ).getAttribute("aria-checked"),
  ).toBe("true");
});
