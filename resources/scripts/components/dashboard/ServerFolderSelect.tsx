import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Folder,
  FolderOpen,
  LoaderCircle,
} from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { Server } from "@/api/server/getServer";
import { assignServerFolder, ServerFolder } from "@/api/serverFolders";
import { httpErrorToHuman } from "@/api/http";
import usePanelTranslation from "@/plugins/usePanelTranslation";

export default function ServerFolderSelect({
  server,
  folders,
}: {
  server: Server;
  folders: ServerFolder[];
}) {
  const { t } = usePanelTranslation();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = folders.find((folder) => folder.id === server.folderId);
  const label = current?.name ?? t("folders.add", "Add to folder");
  const change = async (value: string) => {
    setBusy(true);
    setError("");
    try {
      await assignServerFolder(server.uuid, value ? Number(value) : null);
      await client.invalidateQueries({ queryKey: ["/api/client/servers"] });
    } catch (error) {
      setError(httpErrorToHuman(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="server-folder-control">
      <Menu.Root>
        <Menu.Trigger
          className="server-folder-chip"
          disabled={busy}
          data-assigned={!!current}
          title={label}
          aria-label={t("folders.move_server", "Folder for {{name}}", {
            name: server.name,
          })}
        >
          {busy ? (
            <LoaderCircle size={13} className="is-refreshing" aria-hidden />
          ) : (
            <Folder size={13} aria-hidden />
          )}
          <span>{label}</span>
          <ChevronDown
            size={11}
            className="server-folder-chevron"
            aria-hidden
          />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className="z-50"
          >
            <Menu.Popup
              className="server-folder-menu"
              aria-label={t("folders.choose", "Move to folder")}
            >
              <p className="server-folder-menu-title" aria-hidden>
                {t("folders.choose", "Move to folder")}
              </p>
              <Menu.RadioGroup
                value={String(server.folderId ?? "")}
                onValueChange={change}
                disabled={busy}
              >
                <Menu.RadioItem
                  value=""
                  closeOnClick
                  className="server-folder-option"
                >
                  <FolderOpen size={14} aria-hidden />
                  <span>{t("folders.unfiled", "Unfiled")}</span>
                  <Menu.RadioItemIndicator>
                    <Check size={14} aria-hidden />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
                {folders.map((folder) => (
                  <Menu.RadioItem
                    key={folder.id}
                    value={String(folder.id)}
                    closeOnClick
                    className="server-folder-option"
                  >
                    <Folder size={14} aria-hidden />
                    <span>{folder.name}</span>
                    <Menu.RadioItemIndicator>
                      <Check size={14} aria-hidden />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {error && (
        <p className="server-quick-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
