import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArchive,
  faEllipsisH,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { format, formatDistanceToNow } from "date-fns";
import Spinner from "@/components/elements/Spinner";
import { bytesToString } from "@/lib/formatters";
import Can from "@/components/elements/Can";
import useWebsocketEvent from "@/plugins/useWebsocketEvent";
import BackupContextMenu from "@/components/server/backups/BackupContextMenu";
import classNames from "classnames";
import GreyRowBox from "@/components/elements/GreyRowBox";
import getServerBackups from "@/api/server/backups/getServerBackups";
import { ServerBackup } from "@/api/server/types";
import { SocketEvent } from "@/components/server/events";

interface Props {
  backup: ServerBackup;
  className?: string;
}

export default ({ backup, className }: Props) => {
  const { mutate } = getServerBackups();

  useWebsocketEvent(
    `${SocketEvent.BACKUP_COMPLETED}:${backup.uuid}` as SocketEvent,
    (data) => {
      try {
        const parsed = JSON.parse(data);

        mutate(
          (data) => ({
            ...data,
            items: data.items.map((b) =>
              b.uuid !== backup.uuid
                ? b
                : {
                    ...b,
                    isSuccessful: parsed.is_successful || true,
                    checksum:
                      (parsed.checksum_type || "") +
                      ":" +
                      (parsed.checksum || ""),
                    bytes: parsed.file_size || 0,
                    completedAt: new Date(),
                  },
            ),
          }),
          false,
        );
      } catch (e) {
        console.warn(e);
      }
    },
  );

  return (
    <GreyRowBox
      className={classNames("flex-wrap items-center md:flex-nowrap", className)}
    >
      <div className={"flex w-full items-center truncate md:flex-1"}>
        <div className={"mr-4"}>
          {backup.completedAt !== null ? (
            backup.isLocked ? (
              <FontAwesomeIcon icon={faLock} className={"text-yellow-500"} />
            ) : (
              <FontAwesomeIcon
                icon={faArchive}
                className={"text-neutral-300"}
              />
            )
          ) : (
            <Spinner size={"small"} />
          )}
        </div>
        <div className={"flex flex-col truncate"}>
          <div className={"mb-1 flex items-center text-sm"}>
            {backup.completedAt !== null && !backup.isSuccessful && (
              <span
                className={
                  "mr-2 rounded-full border border-red-600 bg-red-500 px-2 py-px text-xs text-white uppercase"
                }
              >
                Failed
              </span>
            )}
            <p className={"truncate wrap-break-word"}>{backup.name}</p>
            {backup.completedAt !== null && backup.isSuccessful && (
              <span
                className={
                  "ml-3 hidden text-xs font-extralight text-neutral-300 sm:inline"
                }
              >
                {bytesToString(backup.bytes)}
              </span>
            )}
          </div>
          <p
            className={
              "mt-1 truncate font-mono text-xs text-neutral-400 md:mt-0"
            }
          >
            {backup.checksum}
          </p>
        </div>
      </div>
      <div
        className={
          "mt-4 flex-1 md:mt-0 md:ml-8 md:w-48 md:flex-none md:text-center"
        }
      >
        <p
          title={format(backup.createdAt, "EEE, MMMM do, yyyy HH:mm:ss")}
          className={"text-sm"}
        >
          {formatDistanceToNow(backup.createdAt, {
            includeSeconds: true,
            addSuffix: true,
          })}
        </p>
        <p className={"text-2xs mt-1 text-neutral-500 uppercase"}>Created</p>
      </div>
      <Can
        action={["backup.download", "backup.restore", "backup.delete"]}
        matchAny
      >
        <div className={"mt-4 ml-6 md:mt-0"} style={{ marginRight: "-0.5rem" }}>
          {!backup.completedAt ? (
            <div className={"invisible p-2"}>
              <FontAwesomeIcon icon={faEllipsisH} />
            </div>
          ) : (
            <BackupContextMenu backup={backup} />
          )}
        </div>
      </Can>
    </GreyRowBox>
  );
};
