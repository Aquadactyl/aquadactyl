import { fileBitsToString } from "@/helpers";
import useFileManagerQuery from "@/plugins/useFileManagerQuery";
import React, { useEffect } from "react";
import Modal, { RequiredModalProps } from "@/components/elements/Modal";
import { useForm } from "react-hook-form";
import FormField from "@/components/elements/FormField";
import chmodFiles from "@/api/server/files/chmodFiles";
import { ServerContext } from "@/state/server";
import Button from "@/components/elements/Button";
import useFlash from "@/plugins/useFlash";

interface Values {
  mode: string;
}

interface File {
  file: string;
  mode: string;
}

type OwnProps = RequiredModalProps & { files: File[] };

const ChmodFileModal = ({ files, ...props }: OwnProps) => {
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
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      mode: files.length > 1 ? "" : files[0]?.mode || "",
    },
  });

  useEffect(() => {
    reset({
      mode: files.length > 1 ? "" : files[0]?.mode || "",
    });
  }, [files, reset]);

  const onSubmit = async ({ mode }: Values) => {
    clearFlashes("files");

    mutate(
      (data) =>
        data.map((f) =>
          f.name === files[0]?.file
            ? {
                ...f,
                mode: fileBitsToString(mode, !f.isFile),
                modeBits: mode,
              }
            : f,
        ),
      false,
    );

    const data = files.map((f) => ({ file: f.file, mode: mode }));

    try {
      await chmodFiles(uuid, directory, data);
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
        <div className={"flex flex-wrap items-end"}>
          <div className={"w-full sm:mr-4 sm:flex-1"}>
            <FormField
              id={"file_mode"}
              label={"File Mode"}
              autoFocus
              error={errors.mode}
              {...register("mode")}
            />
          </div>
          <div className={"mt-4 w-full sm:mt-0 sm:w-auto"}>
            <Button className={"w-full"} disabled={isSubmitting}>
              Update
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ChmodFileModal;
