import SensitiveValue from "@/components/elements/SensitiveValue";
import React, { useState } from "react";
import { Database, Eye, Trash2 } from "lucide-react";
import Modal from "@/components/elements/Modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "@/components/elements/FormField";
import { z } from "zod";
import FlashMessageRender from "@/components/FlashMessageRender";
import { ServerContext } from "@/state/server";
import deleteServerDatabase from "@/api/server/databases/deleteServerDatabase";
import { httpErrorToHuman } from "@/api/http";
import RotatePasswordButton from "@/components/server/databases/RotatePasswordButton";
import Can from "@/components/elements/Can";
import { ServerDatabase } from "@/api/server/databases/getServerDatabases";
import useFlash from "@/plugins/useFlash";
import classNames from "classnames";
import Button from "@/components/elements/Button";
import Label from "@/components/elements/Label";
import Input from "@/components/elements/Input";
import GreyRowBox from "@/components/elements/GreyRowBox";
import CopyOnClick from "@/components/elements/CopyOnClick";

interface Props {
  database: ServerDatabase;
  className?: string;
}

export default ({ database, className }: Props) => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const { addError, clearFlashes } = useFlash();
  const [visible, setVisible] = useState(false);
  const [connectionVisible, setConnectionVisible] = useState(false);

  const appendDatabase = ServerContext.useStoreActions(
    (actions) => actions.databases.appendDatabase,
  );
  const removeDatabase = ServerContext.useStoreActions(
    (actions) => actions.databases.removeDatabase,
  );

  const jdbcConnectionString = `jdbc:mysql://${database.username}${
    database.password ? `:${encodeURIComponent(database.password)}` : ""
  }@${database.connectionString}/${database.name}`;

  const schema = z.object({
    confirm: z
      .string()
      .min(1, "The database name must be provided.")
      .refine(
        (val) =>
          val === database.name.split("_", 2)[1] || val === database.name,
        {
          message: "The database name must be provided.",
        },
      ),
  });

  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { confirm: "" },
  });

  const onSubmit = async () => {
    clearFlashes();
    try {
      await deleteServerDatabase(uuid, database.id);
      setVisible(false);
      reset();
      setTimeout(() => removeDatabase(database.id), 150);
    } catch (error) {
      console.error(error);
      addError({
        key: "database:delete",
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
          setVisible(false);
          reset();
        }}
      >
        <FlashMessageRender byKey={"database:delete"} className={"mb-6"} />
        <h2 className={"mb-6 text-2xl"}>Confirm database deletion</h2>
        <p className={"text-sm"}>
          Deleting a database is a permanent action, it cannot be undone. This
          will permanently delete the <strong>{database.name}</strong> database
          and remove all associated data.
        </p>
        <form className={"m-0 mt-6"} onSubmit={handleSubmit(onSubmit)}>
          <FormField
            type={"text"}
            id={"confirm_name"}
            label={"Confirm Database Name"}
            description={"Enter the database name to confirm deletion."}
            error={errors.confirm}
            {...register("confirm")}
          />
          <div className={"mt-6 text-right"}>
            <Button
              type={"button"}
              isSecondary
              className={"mr-2"}
              onClick={() => {
                setVisible(false);
                reset();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type={"submit"}
              color={"red"}
              disabled={!isValid || isSubmitting}
            >
              Delete Database
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        visible={connectionVisible}
        onDismissed={() => setConnectionVisible(false)}
      >
        <FlashMessageRender
          byKey={"database-connection-modal"}
          className={"mb-6"}
        />
        <h3 className={"mb-6 text-2xl"}>Database connection details</h3>
        <div>
          <Label>Endpoint</Label>
          <CopyOnClick text={database.connectionString}>
            <Input
              data-sensitive
              type={"text"}
              readOnly
              value={database.connectionString}
            />
          </CopyOnClick>
        </div>
        <div className={"mt-6"}>
          <Label>Connections from</Label>
          <Input
            data-sensitive
            type={"text"}
            readOnly
            value={database.allowConnectionsFrom}
          />
        </div>
        <div className={"mt-6"}>
          <Label>Username</Label>
          <CopyOnClick text={database.username}>
            <Input
              data-sensitive
              type={"text"}
              readOnly
              value={database.username}
            />
          </CopyOnClick>
        </div>
        <Can action={"database.view_password"}>
          <div className={"mt-6"}>
            <Label>Password</Label>
            <CopyOnClick text={database.password} showInNotification={false}>
              <Input
                data-sensitive
                type={"text"}
                readOnly
                value={database.password}
              />
            </CopyOnClick>
          </div>
        </Can>
        <div className={"mt-6"}>
          <Label>JDBC Connection String</Label>
          <CopyOnClick text={jdbcConnectionString} showInNotification={false}>
            <Input
              data-sensitive
              type={"text"}
              readOnly
              value={jdbcConnectionString}
            />
          </CopyOnClick>
        </div>
        <div className={"mt-6 text-right"}>
          <Can action={"database.update"}>
            <RotatePasswordButton
              databaseId={database.id}
              onUpdate={appendDatabase}
            />
          </Can>
          <Button isSecondary onClick={() => setConnectionVisible(false)}>
            Close
          </Button>
        </div>
      </Modal>
      <GreyRowBox $hoverable={false} className={classNames("mb-2", className)}>
        <div className={"hidden md:block"}>
          <Database className={"h-4 w-4"} />
        </div>
        <div className={"ml-4 flex-1"}>
          <CopyOnClick text={database.name}>
            <p className={"text-lg"}>{database.name}</p>
          </CopyOnClick>
        </div>
        <div className={"ml-8 hidden text-center md:block"}>
          <CopyOnClick text={database.connectionString}>
            <p className={"text-sm"}>
              <SensitiveValue>{database.connectionString}</SensitiveValue>
            </p>
          </CopyOnClick>
          <p className={"text-2xs mt-1 text-neutral-500 uppercase select-none"}>
            Endpoint
          </p>
        </div>
        <div className={"ml-8 hidden text-center md:block"}>
          <p className={"text-sm"}>
            <SensitiveValue>{database.allowConnectionsFrom}</SensitiveValue>
          </p>
          <p className={"text-2xs mt-1 text-neutral-500 uppercase select-none"}>
            Connections from
          </p>
        </div>
        <div className={"ml-8 hidden text-center md:block"}>
          <CopyOnClick text={database.username}>
            <p className={"text-sm"}>
              <SensitiveValue>{database.username}</SensitiveValue>
            </p>
          </CopyOnClick>
          <p className={"text-2xs mt-1 text-neutral-500 uppercase select-none"}>
            Username
          </p>
        </div>
        <div className={"ml-8 flex items-center"}>
          <Button
            isSecondary
            className={"mr-2"}
            onClick={() => setConnectionVisible(true)}
          >
            <Eye className={"h-4 w-4"} />
          </Button>
          <Can action={"database.delete"}>
            <Button color={"red"} isSecondary onClick={() => setVisible(true)}>
              <Trash2 className={"h-4 w-4"} />
            </Button>
          </Can>
        </div>
      </GreyRowBox>
    </>
  );
};
