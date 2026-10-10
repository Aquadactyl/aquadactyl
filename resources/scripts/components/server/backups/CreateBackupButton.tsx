import React, { useEffect, useState } from "react";
import Modal from "@/components/elements/Modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "@/components/elements/FormField";
import FormFieldWrapper from "@/components/elements/FormFieldWrapper";
import useFlash from "@/plugins/useFlash";
import createServerBackup from "@/api/server/backups/createServerBackup";
import FlashMessageRender from "@/components/FlashMessageRender";
import Button from "@/components/elements/Button";
import { Textarea } from "@/components/elements/Input";
import getServerBackups from "@/api/server/backups/getServerBackups";
import { ServerContext } from "@/state/server";
import Switch from "@/components/elements/Switch";
import Can from "@/components/elements/Can";

const schema = z.object({
  name: z.string().max(191),
  ignored: z.string(),
  isLocked: z.boolean(),
});

type Values = z.infer<typeof schema>;

interface Props {
  className?: string;
}

export default ({ className }: Props) => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const [visible, setVisible] = useState(false);
  const { mutate } = getServerBackups();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", ignored: "", isLocked: false },
  });

  useEffect(() => {
    clearFlashes("backups:create");
  }, [visible]);

  const onSubmit = async (values: Values) => {
    clearFlashes("backups:create");
    try {
      const backup = await createServerBackup(uuid, values);
      mutate(
        (data) => ({
          ...data,
          items: data.items.concat(backup),
          backupCount: data.backupCount + 1,
        }),
        false,
      );
      setVisible(false);
      reset();
    } catch (error) {
      clearAndAddHttpError({ key: "backups:create", error });
    }
  };

  return (
    <>
      <Modal
        appear
        visible={visible}
        showSpinnerOverlay={isSubmitting}
        dismissable={!isSubmitting}
        onDismissed={() => {
          setVisible(false);
          reset();
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <FlashMessageRender byKey={"backups:create"} className={"mb-4"} />
          <h2 className={"mb-6 text-2xl"}>Create server backup</h2>
          <FormField
            id={"name"}
            label={"Backup name"}
            description={
              "If provided, the name that should be used to reference this backup."
            }
            error={errors.name}
            {...register("name")}
          />
          <div className={"mt-6"}>
            <FormFieldWrapper
              id={"ignored"}
              label={"Ignored Files & Directories"}
              description={`
                Enter the files or folders to ignore while generating this backup. Leave blank to use
                the contents of the .pteroignore file in the root of the server directory if present.
                Wildcard matching of files and folders is supported in addition to negating a rule by
                prefixing the path with an exclamation point.
              `}
              error={errors.ignored}
            >
              <Textarea
                id={"ignored"}
                rows={6}
                disabled={isSubmitting}
                {...register("ignored")}
              />
            </FormFieldWrapper>
          </div>
          <Can action={"backup.delete"}>
            <div
              className={
                "mt-6 rounded border border-neutral-800 bg-neutral-700 p-4 shadow-inner"
              }
            >
              <Switch
                id={"isLocked"}
                label={"Locked"}
                description={
                  "Prevents this backup from being deleted until explicitly unlocked."
                }
                disabled={isSubmitting}
                {...register("isLocked")}
              />
            </div>
          </Can>
          <div className={"mt-6 flex justify-end"}>
            <Button type={"submit"} disabled={isSubmitting}>
              Start backup
            </Button>
          </div>
        </form>
      </Modal>
      <Button
        className={className || "w-full sm:w-auto"}
        onClick={() => setVisible(true)}
      >
        Create backup
      </Button>
    </>
  );
};
