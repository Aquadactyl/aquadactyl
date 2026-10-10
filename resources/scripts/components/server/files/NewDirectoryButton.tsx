import React, { useContext, useEffect, useState } from "react";
import { ServerContext } from "@/state/server";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "@/components/elements/FormField";
import { join, normalize } from "pathe";
import { z } from "zod";
import createDirectory from "@/api/server/files/createDirectory";
import { Button } from "@/components/elements/button/index";
import { FileObject } from "@/api/server/files/loadDirectory";
import { useFlashKey } from "@/plugins/useFlash";
import useFileManagerQuery from "@/plugins/useFileManagerQuery";
import { WithClassname } from "@/components/types";
import FlashMessageRender from "@/components/FlashMessageRender";
import { Dialog, DialogWrapperContext } from "@/components/elements/dialog";
import Code from "@/components/elements/Code";
import asDialog from "@/hoc/asDialog";

interface Values {
  directoryName: string;
}

const schema = z.object({
  directoryName: z.string().min(1, "A valid directory name must be provided."),
});

const displayNameForDirectory = (name: string): string =>
  normalize(name)
    .replace(/^(\.\.\/|\/)+/, "")
    .split("/", 1)[0] || name;

const generateDirectoryData = (name: string): FileObject => {
  const displayName = displayNameForDirectory(name);

  return {
    key: `dir_${displayName}`,
    name: displayName,
    mode: "drwxr-xr-x",
    modeBits: "0755",
    size: 0,
    isFile: false,
    isSymlink: false,
    mimetype: "",
    createdAt: new Date(),
    modifiedAt: new Date(),
    isArchiveType: () => false,
    isEditable: () => false,
  };
};

const NewDirectoryDialog = asDialog({
  title: "Create Directory",
})(() => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const directory = ServerContext.useStoreState(
    (state) => state.files.directory,
  );

  const { mutate } = useFileManagerQuery();
  const { close } = useContext(DialogWrapperContext);
  const { clearAndAddHttpError } = useFlashKey("files:directory-modal");

  useEffect(() => {
    return () => {
      clearAndAddHttpError();
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { directoryName: "" },
  });

  const directoryName = watch("directoryName");

  const onSubmit = async (values: Values) => {
    try {
      await createDirectory(uuid, directory, values.directoryName);
      mutate(
        (data) => [...data, generateDirectoryData(values.directoryName)],
        false,
      );
      close();
    } catch (error) {
      clearAndAddHttpError(error as Error);
    }
  };

  return (
    <>
      <FlashMessageRender key={"files:directory-modal"} />
      <form
        id={"new-directory-form"}
        className={"m-0"}
        onSubmit={handleSubmit(onSubmit)}
      >
        <FormField
          autoFocus
          id={"directoryName"}
          label={"Name"}
          error={errors.directoryName}
          {...register("directoryName")}
        />
        <p className={"mt-2 text-sm break-all md:text-base"}>
          <span className={"text-neutral-200"}>
            This directory will be created as&nbsp;
          </span>
          <Code>
            /home/container/
            <span className={"text-cyan-200"}>
              {join(directory, directoryName || "").replace(
                /^(\.\.\/|\/)+/,
                "",
              )}
            </span>
          </Code>
        </p>
      </form>
      <Dialog.Footer>
        <Button.Text
          className={"w-full sm:w-auto"}
          onClick={close}
          disabled={isSubmitting}
        >
          Cancel
        </Button.Text>
        <Button
          type={"submit"}
          form={"new-directory-form"}
          className={"w-full sm:w-auto"}
          disabled={isSubmitting}
          onClick={handleSubmit(onSubmit)}
        >
          Create
        </Button>
      </Dialog.Footer>
    </>
  );
});

export default ({ className }: WithClassname) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <NewDirectoryDialog open={open} onClose={() => setOpen(false)} />
      <Button.Text onClick={() => setOpen(true)} className={className}>
        Create Directory
      </Button.Text>
    </>
  );
};
