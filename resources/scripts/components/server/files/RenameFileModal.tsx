import React, { useEffect } from "react";
import Modal, { RequiredModalProps } from "@/components/elements/Modal";
import { useForm, useWatch } from "react-hook-form";
import FormField from "@/components/elements/FormField";
import { join } from "pathe";
import renameFiles from "@/api/server/files/renameFiles";
import { ServerContext } from "@/state/server";
import classNames from "classnames";
import Button from "@/components/elements/Button";
import useFileManagerQuery from "@/plugins/useFileManagerQuery";
import useFlash from "@/plugins/useFlash";

interface Values {
  name: string;
}

type OwnProps = RequiredModalProps & {
  files: string[];
  useMoveTerminology?: boolean;
};

const RenameFileModal = ({ files, useMoveTerminology, ...props }: OwnProps) => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const { mutate } = useFileManagerQuery();
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const directory = ServerContext.useStoreState(
    (state) => state.files.directory,
  );
  const setSelectedFiles = ServerContext.useStoreActions(
    (actions) => actions.files.setSelectedFiles,
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: { name: files.length > 1 ? "" : files[0] || "" },
  });

  useEffect(() => {
    reset({ name: files.length > 1 ? "" : files[0] || "" });
  }, [files, reset]);

  const name = useWatch({ control, name: "name" });

  const onSubmit = async ({ name: newName }: Values) => {
    clearFlashes("files");

    const len = newName.split("/").length;
    if (files.length === 1) {
      if (!useMoveTerminology && len === 1) {
        // Rename the file within this directory.
        mutate(
          (data) =>
            data.map((f) =>
              f.name === files[0] ? { ...f, name: newName } : f,
            ),
          false,
        );
      } else if (useMoveTerminology || len > 1) {
        // Remove the file from this directory since they moved it elsewhere.
        mutate((data) => data.filter((f) => f.name !== files[0]), false);
      }
    }

    let data;
    if (useMoveTerminology && files.length > 1) {
      data = files.map((f) => ({ from: f, to: join(newName, f) }));
    } else {
      data = files.map((f) => ({ from: f, to: newName }));
    }

    try {
      await renameFiles(uuid, directory, data);
      if (files.length > 0) {
        await mutate();
      }
      setSelectedFiles([]);
      props.onDismissed();
    } catch (error) {
      mutate();
      clearAndAddHttpError({ key: "files", error });
    }
  };

  return (
    <Modal
      {...props}
      dismissable={!isSubmitting}
      showSpinnerOverlay={isSubmitting}
    >
      <form className={"m-0"} onSubmit={handleSubmit(onSubmit)}>
        <div
          className={classNames(
            "flex flex-wrap",
            useMoveTerminology ? "items-center" : "items-end",
          )}
        >
          <div className={"w-full sm:mr-4 sm:flex-1"}>
            <FormField
              id={"file_name"}
              label={"File Name"}
              description={
                useMoveTerminology
                  ? "Enter the new name and directory of this file or folder, relative to the current directory."
                  : undefined
              }
              autoFocus
              error={errors.name}
              {...register("name")}
            />
          </div>
          <div className={"mt-4 w-full sm:mt-0 sm:w-auto"}>
            <Button className={"w-full"} disabled={isSubmitting}>
              {useMoveTerminology ? "Move" : "Rename"}
            </Button>
          </div>
        </div>
        {useMoveTerminology && (
          <p className={"mt-2 text-xs text-neutral-400"}>
            <strong className={"text-neutral-200"}>New location:</strong>
            &nbsp;/home/container/
            {join(directory, name || "").replace(/^(\.\.\/|\/)+/, "")}
          </p>
        )}
      </form>
    </Modal>
  );
};

export default RenameFileModal;
