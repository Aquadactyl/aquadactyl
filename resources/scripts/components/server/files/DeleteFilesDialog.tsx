import React from "react";
import { File, Info, Trash2 } from "lucide-react";
import { useAppStore } from "@/state";
import { Dialog } from "@/components/elements/dialog";
import { Button } from "@/components/elements/button/index";
import usePanelTranslation from "@/plugins/usePanelTranslation";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  files: string[];
  onDelete: () => void;
  onTrash: () => void;
}

export default ({ open, onClose, title, files, onDelete, onTrash }: Props) => {
  const enabled = useAppStore(
    (state) => state.settings.data?.features?.fileTrash === true,
  );
  const days = useAppStore(
    (state) => state.settings.data?.trash?.retentionDays ?? 7,
  );
  const { t } = usePanelTranslation();
  const selection = (
    <div className="trash-selection mt-4">
      <p className="trash-selection-heading">
        {t("trash.selected_items", "Selected items")}
        <span className="trash-count">{files.length}</span>
      </p>
      <ul className="trash-selection-list">
        {files.slice(0, 15).map((file) => (
          <li key={file}>
            <File size={15} aria-hidden />
            <span>{file}</span>
          </li>
        ))}
        {files.length > 15 && (
          <li>
            {t("trash.more_items", "and {{count}} others", {
              count: files.length - 15,
            })}
          </li>
        )}
      </ul>
    </div>
  );

  if (!enabled)
    return (
      <Dialog.Confirm
        open={open}
        onClose={onClose}
        title={title}
        confirm={t("trash.delete", "Delete")}
        onConfirmed={onDelete}
      >
        <p>
          {t(
            "trash.permanent_warning",
            "This is permanent. These files and their contents cannot be recovered.",
          )}
        </p>
        {selection}
      </Dialog.Confirm>
    );

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-6 text-gray-200">
        {t(
          files.length === 1 ? "trash.choose_single" : "trash.choose_multiple",
          files.length === 1
            ? "Would you like to permanently delete this file or move it to your trash?"
            : "Would you like to permanently delete these files or move them to your trash?",
        )}
      </p>
      {selection}
      <div className="trash-notice mt-4">
        <Info size={18} aria-hidden />
        <p>
          {t(
            "trash.retention_help",
            "Trashed items can be restored for {{days}} days. They still count towards this server’s disk usage.",
            { days },
          )}
        </p>
      </div>
      {files.length > 100 && (
        <p className="mt-2 text-sm text-yellow-300">
          {t(
            "trash.selection_limit",
            "Select up to 100 items at a time to move to trash.",
          )}
        </p>
      )}
      <Dialog.Footer>
        <div className="trash-dialog-actions">
          <Button.Text
            className="trash-control trash-control--neutral"
            onClick={onClose}
          >
            {t("trash.cancel", "Cancel")}
          </Button.Text>
          <Button.Danger
            className="trash-control trash-control--danger"
            onClick={onDelete}
          >
            <Trash2 size={16} aria-hidden />
            {t("trash.permanently_delete", "Permanently delete")}
          </Button.Danger>
          <Button
            className="trash-control"
            disabled={files.length > 100}
            onClick={onTrash}
          >
            <Trash2 size={16} aria-hidden />
            {t("trash.move_to_trash", "Move to trash")}
          </Button>
        </div>
      </Dialog.Footer>
    </Dialog>
  );
};
