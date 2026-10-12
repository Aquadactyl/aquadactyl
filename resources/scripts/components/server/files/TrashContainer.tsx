import React, { useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Clock,
  File,
  Folder,
  Info,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { ServerContext } from "@/state/server";
import { useAppStore } from "@/state";
import { useTanStackQuery, queryClient } from "@/lib/queryClient";
import {
  getTrash,
  restoreTrashItem,
  deleteTrashItem,
  TrashItem,
} from "@/api/server/files/trash";
import ServerContentBlock from "@/components/elements/ServerContentBlock";
import Can from "@/components/elements/Can";
import { Button } from "@/components/elements/button/index";
import { Dialog } from "@/components/elements/dialog";
import Spinner from "@/components/elements/Spinner";
import useFlash from "@/plugins/useFlash";
import usePanelTranslation from "@/plugins/usePanelTranslation";
import { httpErrorToHuman } from "@/api/http";

export default () => {
  const id = ServerContext.useStoreState((state) => state.server.data!.id);
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const enabled = useAppStore(
    (state) => state.settings.data?.features?.fileTrash === true,
  );
  const { t, i18n } = usePanelTranslation();
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string>();
  const [deleting, setDeleting] = useState<TrashItem>();
  const { data, error, isLoading, isValidating, mutate } = useTanStackQuery(
    enabled ? [uuid, "trash", page] : null,
    () => getTrash(uuid, page),
  );

  const operate = async (item: TrashItem, restore: boolean) => {
    if (busy) return;
    setDeleting(undefined);
    setBusy(item.id);
    clearFlashes("trash");
    try {
      await (restore ? restoreTrashItem : deleteTrashItem)(uuid, item.id);
      await queryClient.invalidateQueries({ queryKey: [uuid, "files"] });
    } catch (error) {
      clearAndAddHttpError({ key: "trash", error });
    } finally {
      const updated = await mutate();
      if (updated && page > updated.meta.last_page)
        setPage(updated.meta.last_page);
      setBusy(undefined);
    }
  };
  const formatDate = (date: string) =>
    new Date(date).toLocaleString(i18n.resolvedLanguage || i18n.language);
  if (!enabled)
    return (
      <ServerContentBlock title={t("files.file_manager", "File Manager")}>
        <p>{t("trash.disabled", "This page is unavailable.")}</p>
        <Link
          className="text-primary-300 mt-4 inline-block"
          to={`/server/${id}/files`}
        >
          {t("trash.back_to_files", "Back to files")}
        </Link>
      </ServerContentBlock>
    );

  return (
    <ServerContentBlock title={t("trash.title", "Trash")} showFlashKey="trash">
      <div className="trash-header">
        <div className="trash-heading">
          <span className="trash-heading-icon">
            <Trash2 size={24} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-gray-50">
              {t("trash.title", "Trash")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
              {t(
                "trash.description",
                "Restore items to their original location or permanently delete them. Expired items are removed automatically.",
              )}
            </p>
          </div>
        </div>
        <div className="trash-header-actions">
          <Link
            className="trash-control trash-control--neutral"
            to={`/server/${id}/files`}
          >
            <ArrowLeft size={16} aria-hidden />
            {t("trash.back_to_files", "Back to files")}
          </Link>
        </div>
      </div>
      <div className="trash-notice mb-5">
        <Info size={18} aria-hidden />
        <p>
          {t(
            "trash.storage_help",
            "Items stay on this server until their expiry date and still count towards its disk usage.",
          )}
        </p>
      </div>
      <section className="trash-panel" aria-labelledby="trash-items-heading">
        <div className="trash-toolbar">
          <h2 id="trash-items-heading" className="flex items-center gap-2.5">
            {t("trash.deleted_items", "Deleted items")}
            {data && <span className="trash-count">{data.meta.total}</span>}
          </h2>
          <Button.Text
            className="trash-control trash-control--neutral"
            disabled={!!busy || isValidating}
            onClick={() => mutate()}
          >
            <RefreshCw
              size={15}
              className={isValidating ? "animate-spin" : undefined}
              aria-hidden
            />
            {t("trash.refresh", "Refresh")}
          </Button.Text>
        </div>
        {error ? (
          <div role="alert" className="trash-state">
            <span className="trash-state-icon text-red-300">
              <AlertTriangle size={28} aria-hidden />
            </span>
            <p className="max-w-lg text-sm leading-6 text-red-300">
              {httpErrorToHuman(error)}
            </p>
            <Button className="trash-control" onClick={() => mutate()}>
              <RefreshCw size={16} aria-hidden />
              {t("trash.retry", "Retry")}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="trash-state" role="status">
            <Spinner centered />
            <p className="text-sm text-gray-400">
              {t("trash.loading", "Loading trash…")}
            </p>
          </div>
        ) : data?.data.length ? (
          <ul className="trash-list">
            {data.data.map((item) => {
              const expired = new Date(item.expires_at).getTime() <= Date.now();
              const Icon = item.is_file ? File : Folder;
              return (
                <li key={item.id} className="trash-item">
                  <span className="trash-file-icon">
                    <Icon size={20} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="trash-item-heading">
                      <h3 className="text-sm font-semibold break-all text-gray-100">
                        {item.name}
                      </h3>
                      <span
                        className={`trash-status ${!item.ready || expired ? "trash-status--warning" : "trash-status--ready"}`}
                      >
                        {!item.ready ? (
                          <Clock size={12} aria-hidden />
                        ) : expired ? (
                          <CalendarClock size={12} aria-hidden />
                        ) : (
                          <Check size={12} aria-hidden />
                        )}
                        {!item.ready
                          ? t("trash.pending_label", "Pending")
                          : expired
                            ? t("trash.expired", "Expired")
                            : t("trash.available", "Recoverable")}
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-xs leading-5 break-all text-gray-400">
                      {item.path}
                    </p>
                    <div className="trash-item-dates">
                      <p>
                        <Clock size={13} aria-hidden />
                        <span>
                          {t("trash.deleted_at", "Deleted: {{date}}", {
                            date: formatDate(item.deleted_at),
                          })}
                        </span>
                      </p>
                      <p className={expired ? "text-yellow-300" : undefined}>
                        <CalendarClock size={13} aria-hidden />
                        <span>
                          {t("trash.expires_at", "Expires: {{date}}", {
                            date: formatDate(item.expires_at),
                          })}
                        </span>
                      </p>
                    </div>
                    {!item.ready && (
                      <p className="mt-2 text-xs text-yellow-300">
                        {t(
                          "trash.pending",
                          "Move pending confirmation. Refresh or retry when Wings is available.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="trash-item-actions">
                    <Can action={["file.create", "file.delete"]}>
                      <Button
                        className="trash-control"
                        disabled={!!busy || expired || !item.ready}
                        onClick={() => operate(item, true)}
                      >
                        {busy === item.id ? (
                          <LoaderCircle
                            size={15}
                            className="animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <RotateCcw size={15} aria-hidden />
                        )}
                        {t("trash.restore", "Restore")}
                      </Button>
                    </Can>
                    <Can action="file.delete">
                      <Button.Danger
                        className="trash-control trash-control--danger trash-control--icon"
                        aria-label={t(
                          "trash.permanently_delete",
                          "Permanently delete",
                        )}
                        title={t(
                          "trash.permanently_delete",
                          "Permanently delete",
                        )}
                        disabled={!!busy}
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 size={16} aria-hidden />
                      </Button.Danger>
                    </Can>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="trash-state">
            <span className="trash-state-icon text-primary-300">
              <Trash2 size={30} aria-hidden />
            </span>
            <h3 className="text-base font-medium text-gray-100">
              {t("trash.empty", "Your server trash is empty.")}
            </h3>
            <p className="max-w-sm text-sm leading-6 text-gray-400">
              {t(
                "trash.empty_help",
                "Files and folders you move to trash will appear here.",
              )}
            </p>
          </div>
        )}
      </section>
      {data && data.meta.last_page > 1 && (
        <div className="trash-pagination">
          <Button.Text
            className="trash-control trash-control--neutral"
            disabled={page <= 1 || !!busy}
            onClick={() => setPage(page - 1)}
          >
            <ArrowLeft size={15} aria-hidden />
            {t("trash.previous", "Previous")}
          </Button.Text>
          <span className="text-sm text-gray-400">
            {t("trash.page", "Page {{page}} of {{pages}}", {
              page,
              pages: data.meta.last_page,
            })}
          </span>
          <Button.Text
            className="trash-control trash-control--neutral"
            disabled={page >= data.meta.last_page || !!busy}
            onClick={() => setPage(page + 1)}
          >
            {t("trash.next", "Next")}
            <ArrowRight size={15} aria-hidden />
          </Button.Text>
        </div>
      )}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        title={t("trash.permanently_delete", "Permanently delete")}
      >
        <div className="trash-notice trash-notice--danger">
          <AlertTriangle size={18} aria-hidden />
          <p>
            {t(
              "trash.purge_warning",
              "Permanently delete {{name}}? This cannot be undone.",
              { name: deleting?.name },
            )}
          </p>
        </div>
        {deleting && (
          <div className="trash-selection mt-4">
            <p className="text-sm font-medium break-all text-gray-100">
              {deleting.name}
            </p>
            <p className="mt-1 font-mono text-xs break-all text-gray-400">
              {deleting.path}
            </p>
          </div>
        )}
        <Dialog.Footer>
          <div className="trash-dialog-actions">
            <Button.Text
              className="trash-control trash-control--neutral"
              onClick={() => setDeleting(undefined)}
            >
              {t("trash.cancel", "Cancel")}
            </Button.Text>
            <Button.Danger
              className="trash-control"
              onClick={() => deleting && operate(deleting, false)}
            >
              <Trash2 size={16} aria-hidden />
              {t("trash.permanently_delete", "Permanently delete")}
            </Button.Danger>
          </div>
        </Dialog.Footer>
      </Dialog>
    </ServerContentBlock>
  );
};
