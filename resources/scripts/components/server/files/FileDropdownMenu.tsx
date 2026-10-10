import React, { memo, useRef, useState } from "react";
import {
  Ellipsis,
  Pencil,
  CornerUpRight,
  FileCode,
  Copy,
  ArchiveRestore,
  Archive,
  Download,
  Trash2,
} from "lucide-react";
import RenameFileModal from "@/components/server/files/RenameFileModal";
import { ServerContext } from "@/state/server";
import { join } from "pathe";
import deleteFiles from "@/api/server/files/deleteFiles";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import copyFile from "@/api/server/files/copyFile";
import Can from "@/components/elements/Can";
import getFileDownloadUrl from "@/api/server/files/getFileDownloadUrl";
import useFlash from "@/plugins/useFlash";
import classNames from "classnames";
import { FileObject } from "@/api/server/files/loadDirectory";
import useFileManagerQuery from "@/plugins/useFileManagerQuery";
import DropdownMenu from "@/components/elements/DropdownMenu";
import useEventListener from "@/plugins/useEventListener";
import compressFiles from "@/api/server/files/compressFiles";
import decompressFiles from "@/api/server/files/decompressFiles";
import isEqual from "react-fast-compare";
import ChmodFileModal from "@/components/server/files/ChmodFileModal";
import { Dialog } from "@/components/elements/dialog";

import DropdownItems from "@blueprint/components/Server/Files/Browse/DropdownItems";

type ModalType = "rename" | "move" | "chmod";

interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  $danger?: boolean;
}

const Row = ({
  icon: IconComponent,
  title,
  $danger,
  className,
  ...props
}: RowProps) => (
  <div
    className={classNames(
      "flex cursor-pointer items-center rounded p-2",
      $danger
        ? "hover:bg-red-900 hover:text-red-200"
        : "hover:bg-neutral-600 hover:text-neutral-50",
      className,
    )}
    {...props}
  >
    <IconComponent size={14} className={"mr-2 shrink-0"} />
    <span>{title}</span>
  </div>
);

const FileDropdownMenu = ({ file }: { file: FileObject }) => {
  const onClickRef = useRef<DropdownMenu>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [modal, setModal] = useState<ModalType | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const { mutate } = useFileManagerQuery();
  const { clearAndAddHttpError, clearFlashes } = useFlash();
  const directory = ServerContext.useStoreState(
    (state) => state.files.directory,
  );

  useEventListener(`pterodactyl:files:ctx:${file.key}`, (e: CustomEvent) => {
    if (onClickRef.current) {
      onClickRef.current.triggerMenu(e.detail);
    }
  });

  const doDeletion = () => {
    clearFlashes("files");

    // For UI speed, immediately remove the file from the listing before calling the deletion function.
    // If the delete actually fails, we'll fetch the current directory contents again automatically.
    mutate((files) => files.filter((f) => f.key !== file.key), false);

    deleteFiles(uuid, directory, [file.name]).catch((error) => {
      mutate();
      clearAndAddHttpError({ key: "files", error });
    });
  };

  const doCopy = () => {
    setShowSpinner(true);
    clearFlashes("files");

    copyFile(uuid, join(directory, file.name))
      .then(() => mutate())
      .catch((error) => clearAndAddHttpError({ key: "files", error }))
      .then(() => setShowSpinner(false));
  };

  const doDownload = () => {
    setShowSpinner(true);
    clearFlashes("files");

    getFileDownloadUrl(uuid, join(directory, file.name))
      .then((url) => {
        // @ts-expect-error this is valid
        window.location = url;
      })
      .catch((error) => clearAndAddHttpError({ key: "files", error }))
      .then(() => setShowSpinner(false));
  };

  const doArchive = () => {
    setShowSpinner(true);
    clearFlashes("files");

    compressFiles(uuid, directory, [file.name])
      .then(() => mutate())
      .catch((error) => clearAndAddHttpError({ key: "files", error }))
      .then(() => setShowSpinner(false));
  };

  const doUnarchive = () => {
    setShowSpinner(true);
    clearFlashes("files");

    decompressFiles(uuid, directory, file.name)
      .then(() => mutate())
      .catch((error) => clearAndAddHttpError({ key: "files", error }))
      .then(() => setShowSpinner(false));
  };

  return (
    <>
      <Dialog.Confirm
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title={`Delete ${file.isFile ? "File" : "Directory"}`}
        confirm={"Delete"}
        onConfirmed={doDeletion}
      >
        You will not be able to recover the contents of&nbsp;
        <span className={"font-semibold text-gray-50"}>{file.name}</span> once
        deleted.
      </Dialog.Confirm>
      <DropdownMenu
        ref={onClickRef}
        renderToggle={(onClick) => (
          <div className={"px-4 py-2 hover:text-white"} onClick={onClick}>
            <Ellipsis size={16} />
            {modal ? (
              modal === "chmod" ? (
                <ChmodFileModal
                  visible
                  appear
                  files={[
                    {
                      file: file.name,
                      mode: file.modeBits,
                    },
                  ]}
                  onDismissed={() => setModal(null)}
                />
              ) : (
                <RenameFileModal
                  visible
                  appear
                  files={[file.name]}
                  useMoveTerminology={modal === "move"}
                  onDismissed={() => setModal(null)}
                />
              )
            ) : null}
            <SpinnerOverlay visible={showSpinner} fixed size={"large"} />
          </div>
        )}
      >
        <Can action={"file.update"}>
          <Row
            onClick={() => setModal("rename")}
            icon={Pencil}
            title={"Rename"}
          />
          <Row
            onClick={() => setModal("move")}
            icon={CornerUpRight}
            title={"Move"}
          />
          <Row
            onClick={() => setModal("chmod")}
            icon={FileCode}
            title={"Permissions"}
          />
        </Can>
        {file.isFile && (
          <Can action={"file.create"}>
            <Row onClick={doCopy} icon={Copy} title={"Copy"} />
          </Can>
        )}
        {file.isArchiveType() ? (
          <Can action={"file.create"}>
            <Row
              onClick={doUnarchive}
              icon={ArchiveRestore}
              title={"Unarchive"}
            />
          </Can>
        ) : (
          <Can action={"file.archive"}>
            <Row onClick={doArchive} icon={Archive} title={"Archive"} />
          </Can>
        )}
        {file.isFile && (
          <Row onClick={doDownload} icon={Download} title={"Download"} />
        )}
        <Can action={"file.delete"}>
          <Row
            onClick={() => setShowConfirmation(true)}
            icon={Trash2}
            title={"Delete"}
            $danger
          />
        </Can>
        <DropdownItems />
      </DropdownMenu>
    </>
  );
};

export default memo(FileDropdownMenu, isEqual);
