import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DeleteFilesDialog from "./DeleteFilesDialog";

const settings = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({
    t: (_key: string, fallback: string, values: Record<string, unknown> = {}) =>
      fallback.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(values[key])),
  }),
}));
vi.mock("@/state", () => ({
  useAppStore: (select: (state: unknown) => unknown) =>
    select({
      settings: {
        data: {
          features: { fileTrash: settings.enabled },
          trash: { retentionDays: 14 },
        },
      },
    }),
}));
vi.mock("motion/react", () => ({
  motion: {
    div: ({
      initial: _initial,
      animate: _animate,
      exit: _exit,
      variants: _variants,
      ...props
    }: Record<string, unknown>) => <div {...props} />,
  },
}));
afterEach(() => {
  cleanup();
  settings.enabled = false;
});
const onDelete = vi.fn(),
  onTrash = vi.fn();
beforeEach(() => {
  onDelete.mockClear();
  onTrash.mockClear();
});
const show = (files = ["notes.txt"]) =>
  render(
    <DeleteFilesDialog
      open
      onClose={() => {}}
      title="Delete Files"
      files={files}
      onDelete={onDelete}
      onTrash={onTrash}
    />,
  );

it("keeps permanent deletion and hides all trash choices when disabled", () => {
  show();
  expect(screen.queryByRole("button", { name: "Move to trash" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(onDelete).toHaveBeenCalledOnce();
  expect(onTrash).not.toHaveBeenCalled();
});
it("shows both choices, the admin retention, and routes the trash choice separately", () => {
  settings.enabled = true;
  show(["notes.txt", "world"]);
  expect(
    screen.getByText(
      "Would you like to permanently delete these files or move them to your trash?",
    ),
  ).toBeDefined();
  expect(screen.getByText(/14 days/)).toBeDefined();
  expect(
    screen.getByRole("button", { name: "Permanently delete" }),
  ).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Move to trash" }));
  expect(onTrash).toHaveBeenCalledOnce();
  expect(onDelete).not.toHaveBeenCalled();
});
it("does not enable trash for oversized selections", () => {
  settings.enabled = true;
  show(Array.from({ length: 101 }, (_, index) => `file-${index}`));
  expect(
    screen
      .getByRole("button", { name: "Move to trash" })
      .getAttribute("disabled"),
  ).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));
  expect(onDelete).toHaveBeenCalledOnce();
  expect(onTrash).not.toHaveBeenCalled();
});
