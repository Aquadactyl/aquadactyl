import React, { useState } from "react";
import Modal from "@/components/elements/Modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "@/components/elements/FormField";
import { z } from "zod";
import createServerDatabase from "@/api/server/databases/createServerDatabase";
import { ServerContext } from "@/state/server";
import { httpErrorToHuman } from "@/api/http";
import FlashMessageRender from "@/components/FlashMessageRender";
import useFlash from "@/plugins/useFlash";
import Button from "@/components/elements/Button";

const schema = z.object({
  databaseName: z
    .string()
    .min(3, "Database name must be at least 3 characters.")
    .max(48, "Database name must not exceed 48 characters.")
    .regex(
      /^[\w\-.]{3,48}$/,
      "Database name should only contain alphanumeric characters, underscores, dashes, and/or periods.",
    ),
  connectionsFrom: z
    .string()
    .refine(
      (val) => !val || /^[\w\-/.%:]+$/.test(val),
      "A valid host address must be provided.",
    ),
});

type Values = z.infer<typeof schema>;

interface Props {
  className?: string;
}

export default ({ className }: Props) => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const { addError, clearFlashes } = useFlash();
  const [visible, setVisible] = useState(false);

  const appendDatabase = ServerContext.useStoreActions(
    (actions) => actions.databases.appendDatabase,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { databaseName: "", connectionsFrom: "" },
  });

  const onSubmit = async (values: Values) => {
    clearFlashes("database:create");
    try {
      const database = await createServerDatabase(uuid, {
        databaseName: values.databaseName,
        connectionsFrom: values.connectionsFrom || "%",
      });
      appendDatabase(database);
      setVisible(false);
      reset();
    } catch (error) {
      addError({
        key: "database:create",
        message: httpErrorToHuman(error),
      });
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        dismissable={!isSubmitting}
        showSpinnerOverlay={isSubmitting}
        onDismissed={() => {
          reset();
          setVisible(false);
        }}
      >
        <FlashMessageRender byKey={"database:create"} className={"mb-6"} />
        <h2 className={"mb-6 text-2xl"}>Create new database</h2>
        <form className={"m-0"} onSubmit={handleSubmit(onSubmit)}>
          <FormField
            type={"text"}
            id={"database_name"}
            label={"Database Name"}
            description={"A descriptive name for your database instance."}
            error={errors.databaseName}
            {...register("databaseName")}
          />
          <div className={"mt-6"}>
            <FormField
              type={"text"}
              id={"connections_from"}
              label={"Connections From"}
              description={
                "Where connections should be allowed from. Leave blank to allow connections from anywhere."
              }
              error={errors.connectionsFrom}
              {...register("connectionsFrom")}
            />
          </div>
          <div className={"mt-6 flex flex-wrap justify-end"}>
            <Button
              type={"button"}
              isSecondary
              className={"w-full sm:mr-2 sm:w-auto"}
              onClick={() => {
                reset();
                setVisible(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className={"mt-4 w-full sm:mt-0 sm:w-auto"}
              type={"submit"}
              disabled={isSubmitting}
            >
              Create Database
            </Button>
          </div>
        </form>
      </Modal>
      <Button className={className} onClick={() => setVisible(true)}>
        New Database
      </Button>
    </>
  );
};
