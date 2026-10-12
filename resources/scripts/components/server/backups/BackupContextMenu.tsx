import React, { useState } from "react";
import {
  Ellipsis,
  Download,
  ArchiveRestore,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import DropdownMenu, {
  DropdownButtonRow,
} from "@/components/elements/DropdownMenu";
import getBackupDownloadUrl from "@/api/server/backups/getBackupDownloadUrl";
import useFlash from "@/plugins/useFlash";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import deleteBackup from "@/api/server/backups/deleteBackup";
import Can from "@/components/elements/Can";
import getServerBackups from "@/api/server/backups/getServerBackups";
import { ServerBackup } from "@/globals";
import { ServerContext } from "@/state/server";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import { restoreServerBackup } from "@/api/server/backups";
import http, { httpErrorToHuman } from "@/api/http";
import { Dialog } from "@/components/elements/dialog";

import DropdownItems from "@blueprint/components/Server/Backups/DropdownItems";

interface Props {
  backup: ServerBackup;
}

export default ({ backup }: Props) => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const setServerFromState = ServerContext.useStoreActions(
    (actions) => actions.server.setServerFromState,
  );
  const [modal, setModal] = useState("");
  const [loading, setLoading] = useState(false);
  const [truncate, setTruncate] = useState(false);
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const { mutate } = getServerBackups();

  const doDownload = () => {
    setLoading(true);
    clearFlashes("backups");
    getBackupDownloadUrl(uuid, backup.uuid)
      .then((url) => {
        // @ts-expect-error this is valid
        window.location = url;
      })
      .catch((error) => {
        console.error(error);
        clearAndAddHttpError({ key: "backups", error });
      })
      .then(() => setLoading(false));
  };

  const doDeletion = () => {
    setLoading(true);
    clearFlashes("backups");
    deleteBackup(uuid, backup.uuid)
      .then(() =>
        mutate(
          (data) => ({
            ...data,
            items: data.items.filter((b) => b.uuid !== backup.uuid),
            backupCount: data.backupCount - 1,
          }),
          false,
        ),
      )
      .catch((error) => {
        console.error(error);
        clearAndAddHttpError({ key: "backups", error });
        setLoading(false);
        setModal("");
      });
  };

  const doRestorationAction = () => {
    setLoading(true);
    clearFlashes("backups");
    restoreServerBackup(uuid, backup.uuid, truncate)
      .then(() =>
        setServerFromState((s) => ({
          ...s,
          status: "restoring_backup",
        })),
      )
      .catch((error) => {
        console.error(error);
        clearAndAddHttpError({ key: "backups", error });
      })
      .then(() => setLoading(false))
      .then(() => setModal(""));
  };

  const onLockToggle = () => {
    if (backup.isLocked && modal !== "unlock") {
      return setModal("unlock");
    }

    http
      .post(`/api/client/servers/${uuid}/backups/${backup.uuid}/lock`)
      .then(() =>
        mutate(
          (data) => ({
            ...data,
            items: data.items.map((b) =>
              b.uuid !== backup.uuid
                ? b
                : {
                    ...b,
                    isLocked: !b.isLocked,
                  },
            ),
          }),
          false,
        ),
      )
      .catch((error) => alert(httpErrorToHuman(error)))
      .then(() => setModal(""));
  };

  return (
    <>
      <Dialog.Confirm
        open={modal === "unlock"}
        onClose={() => setModal("")}
        title={`Unlock "${backup.name}"`}
        onConfirmed={onLockToggle}
      >
        This backup will no longer be protected from automated or accidental
        deletions.
      </Dialog.Confirm>
      <Dialog.Confirm
        open={modal === "restore"}
        onClose={() => setModal("")}
        confirm={"Restore"}
        title={`Restore "${backup.name}"`}
        onConfirmed={() => doRestorationAction()}
      >
        <p>
          Your server will be stopped. You will not be able to control the power
          state, access the file manager, or create additional backups until
          completed.
        </p>
        <p className={"mt-4 -mb-2 rounded bg-gray-700 p-3"}>
          <label
            htmlFor={"restore_truncate"}
            className={"flex cursor-pointer items-center text-base"}
          >
            <BaseCheckbox.Root
              id={"restore_truncate"}
              checked={truncate}
              onCheckedChange={(checked) => setTruncate(checked)}
              className={
                "mr-3 inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-neutral-500 bg-neutral-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 data-checked:border-transparent data-checked:bg-red-500"
              }
            >
              <BaseCheckbox.Indicator className="flex items-center justify-center text-white">
                <Check className="h-3.5 w-3.5 stroke-3" />
              </BaseCheckbox.Indicator>
            </BaseCheckbox.Root>
            Delete all files before restoring backup.
          </label>
        </p>
      </Dialog.Confirm>
      <Dialog.Confirm
        title={`Delete "${backup.name}"`}
        confirm={"Continue"}
        open={modal === "delete"}
        onClose={() => setModal("")}
        onConfirmed={doDeletion}
      >
        This is a permanent operation. The backup cannot be recovered once
        deleted.
      </Dialog.Confirm>
      <SpinnerOverlay visible={loading} fixed />
      {backup.isSuccessful ? (
        <DropdownMenu
          renderToggle={(onClick) => (
            <button
              onClick={onClick}
              className={
                "cursor-pointer p-2 text-gray-200 transition-colors duration-150 hover:text-gray-100"
              }
            >
              <Ellipsis size={16} />
            </button>
          )}
        >
          <div className={"text-sm"}>
            <Can action={"backup.download"}>
              <DropdownButtonRow onClick={doDownload}>
                <Download size={14} className={"mr-2 shrink-0"} />
                <span>Download</span>
              </DropdownButtonRow>
            </Can>
            <Can action={"backup.restore"}>
              <DropdownButtonRow onClick={() => setModal("restore")}>
                <ArchiveRestore size={14} className={"mr-2 shrink-0"} />
                <span>Restore</span>
              </DropdownButtonRow>
            </Can>
            <Can action={"backup.delete"}>
              <>
                <DropdownButtonRow onClick={onLockToggle}>
                  {backup.isLocked ? (
                    <Unlock size={14} className={"mr-2 shrink-0"} />
                  ) : (
                    <Lock size={14} className={"mr-2 shrink-0"} />
                  )}
                  {backup.isLocked ? "Unlock" : "Lock"}
                </DropdownButtonRow>
                {!backup.isLocked && (
                  <DropdownButtonRow danger onClick={() => setModal("delete")}>
                    <Trash2 size={14} className={"mr-2 shrink-0"} />
                    <span>Delete</span>
                  </DropdownButtonRow>
                )}
              </>
            </Can>
          </div>
          <DropdownItems />
        </DropdownMenu>
      ) : (
        <button
          onClick={() => setModal("delete")}
          className={
            "cursor-pointer p-2 text-gray-200 transition-colors duration-150 hover:text-gray-100"
          }
        >
          <Trash2 size={16} />
        </button>
      )}
    </>
  );
};
