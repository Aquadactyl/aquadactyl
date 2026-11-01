import React, { useState } from "react";
import { Folder, FolderOpen, FolderPlus, Pencil, Trash2 } from "lucide-react";
import {
  ServerFolder,
  saveServerFolder,
  deleteServerFolder,
} from "@/api/serverFolders";
import { httpErrorToHuman } from "@/api/http";
import { Dialog } from "@/components/elements/dialog";
import Input from "@/components/elements/Input";
import { Button } from "@/components/elements/button/index";
import usePanelTranslation from "@/plugins/usePanelTranslation";

interface Props {
  folders: ServerFolder[];
  active: string;
  onSelect: (folder: string) => void;
  onChange: () => Promise<unknown>;
}
export default function ServerFolderBar({
  folders,
  active,
  onSelect,
  onChange,
}: Props) {
  const { t } = usePanelTranslation();
  const [dialog, setDialog] = useState<{
    kind: "create" | "rename" | "delete";
    folder?: ServerFolder;
  } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = folders.find((folder) => String(folder.id) === active);
  const open = (
    kind: "create" | "rename" | "delete",
    folder?: ServerFolder,
  ) => {
    setName(folder?.name ?? "");
    setError("");
    setDialog({ kind, folder });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const operation = dialog!;
    setBusy(true);
    setError("");
    try {
      if (operation.kind === "delete") {
        await deleteServerFolder(operation.folder!.id);
        onSelect("all");
      } else await saveServerFolder(name.trim(), operation.folder?.id);
      await onChange();
      setDialog(null);
    } catch (error) {
      setError(httpErrorToHuman(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div
        className="server-folders"
        aria-label={t("folders.title", "Server folders")}
      >
        <div
          className="server-folder-tabs"
          role="group"
          aria-label={t("folders.filter", "Filter by folder")}
        >
          <button
            type="button"
            aria-pressed={active === "all"}
            onClick={() => onSelect("all")}
          >
            <FolderOpen size={15} aria-hidden />
            {t("folders.all", "All servers")}
          </button>
          <button
            type="button"
            aria-pressed={active === "unfiled"}
            onClick={() => onSelect("unfiled")}
          >
            {t("folders.unfiled", "Unfiled")}
          </button>
          {folders.map((folder) => (
            <button
              type="button"
              key={folder.id}
              aria-pressed={active === String(folder.id)}
              onClick={() => onSelect(String(folder.id))}
            >
              <Folder size={14} aria-hidden />
              {folder.name}
            </button>
          ))}
        </div>
        <div className="server-folder-actions">
          {current && (
            <>
              <button
                type="button"
                className="refresh-servers"
                aria-label={t("folders.rename", "Rename folder")}
                title={t("folders.rename", "Rename folder")}
                onClick={() => open("rename", current)}
              >
                <Pencil size={15} aria-hidden />
              </button>
              <button
                type="button"
                className="refresh-servers"
                aria-label={t("folders.delete", "Delete folder")}
                title={t("folders.delete", "Delete folder")}
                onClick={() => open("delete", current)}
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </>
          )}
          <button
            type="button"
            className="panel-link-button"
            onClick={() => open("create")}
          >
            <FolderPlus size={15} aria-hidden />
            {t("folders.create", "New folder")}
          </button>
        </div>
      </div>
      <Dialog
        open={dialog !== null}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        preventExternalClose={busy}
        title={
          dialog?.kind === "delete"
            ? t("folders.delete", "Delete folder")
            : dialog?.kind === "rename"
              ? t("folders.rename", "Rename folder")
              : t("folders.create", "New folder")
        }
      >
        <form id="server-folder-form" onSubmit={save}>
          {dialog?.kind === "delete" ? (
            <p className="text-sm text-neutral-300">
              {t(
                "folders.delete_help",
                "Only the folder is removed. Your servers and their files will remain unchanged.",
              )}
            </p>
          ) : (
            <>
              <label
                htmlFor="server-folder-name"
                className="mb-2 block text-sm"
              >
                {t("folders.name", "Folder name")}
              </label>
              <Input
                id="server-folder-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={64}
                required
                disabled={busy}
                autoFocus
              />
              <p className="mt-2 text-xs text-neutral-400">
                {t(
                  "folders.personal_help",
                  "Folders are personal to your account and available on all your devices.",
                )}
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button.Text
              type="button"
              disabled={busy}
              onClick={() => setDialog(null)}
            >
              {t("folders.cancel", "Cancel")}
            </Button.Text>
            <Button
              type="submit"
              form="server-folder-form"
              disabled={busy || (dialog?.kind !== "delete" && !name.trim())}
            >
              {busy
                ? t("folders.saving", "Saving...")
                : dialog?.kind === "delete"
                  ? t("folders.delete", "Delete folder")
                  : t("folders.save", "Save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
