import SensitiveValue from "@/components/elements/SensitiveValue";
import React, { useContext, useEffect, useMemo, useRef } from "react";
import { Subuser } from "@/state/server/subusers";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "@/components/elements/FormField";
import { useAppStore } from "@/state";
import useFlash from "@/plugins/useFlash";
import createOrUpdateSubuser from "@/api/server/users/createOrUpdateSubuser";
import { ServerContext } from "@/state/server";
import FlashMessageRender from "@/components/FlashMessageRender";
import Can from "@/components/elements/Can";
import { usePermissions } from "@/plugins/usePermissions";
import { useDeepCompareMemo } from "@/plugins/useDeepCompareMemo";
import Button from "@/components/elements/Button";
import PermissionTitleBox from "@/components/server/users/PermissionTitleBox";
import asModal from "@/hoc/asModal";
import PermissionRow from "@/components/server/users/PermissionRow";
import ModalContext from "@/context/ModalContext";

type Props = {
  subuser?: Subuser;
};

interface Values {
  email: string;
  permissions: string[];
}

const EditSubuserModal = ({ subuser }: Props) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const appendSubuser = ServerContext.useStoreActions(
    (actions) => actions.subusers.appendSubuser,
  );
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const { dismiss, setPropOverrides } = useContext(ModalContext);

  const isRootAdmin = useAppStore((state) => state.user.data!.rootAdmin);
  const permissions = useAppStore((state) => state.permissions.data);
  const loggedInPermissions = ServerContext.useStoreState(
    (state) => state.server.permissions,
  );
  const [canEditUser] = usePermissions(
    subuser ? ["user.update"] : ["user.create"],
  );

  const editablePermissions = useDeepCompareMemo(() => {
    const cleaned = Object.keys(permissions).map((key) =>
      Object.keys(permissions[key].keys).map((pkey) => `${key}.${pkey}`),
    );

    const list: string[] = ([] as string[]).concat.apply(
      [],
      Object.values(cleaned),
    );

    if (
      isRootAdmin ||
      (loggedInPermissions.length === 1 && loggedInPermissions[0] === "*")
    ) {
      return list;
    }

    return list.filter((key) => loggedInPermissions.indexOf(key) >= 0);
  }, [isRootAdmin, permissions, loggedInPermissions]);

  const schema = useMemo(
    () =>
      z.object({
        email: subuser
          ? z.string()
          : z
              .string()
              .min(1, "A valid email address must be provided.")
              .max(191, "Email addresses must not exceed 191 characters.")
              .email("A valid email address must be provided."),
        permissions: z.array(z.string()),
      }),
    [subuser],
  );

  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: subuser?.email || "",
      permissions: subuser?.permissions || [],
    },
  });

  const submit = (values: Values) => {
    setPropOverrides({ showSpinnerOverlay: true });
    clearFlashes("user:edit");

    createOrUpdateSubuser(uuid, values, subuser)
      .then((subuser) => {
        appendSubuser(subuser);
        dismiss();
      })
      .catch((error) => {
        console.error(error);
        setPropOverrides(null);
        clearAndAddHttpError({ key: "user:edit", error });

        if (ref.current) {
          ref.current.scrollIntoView();
        }
      });
  };

  useEffect(
    () => () => {
      clearFlashes("user:edit");
    },
    [],
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(submit)}>
        <div className={"flex justify-between"}>
          <h2 className={"text-2xl"} ref={ref}>
            {subuser ? (
              <>
                {canEditUser ? "Modify" : "View"} permissions for{" "}
                <SensitiveValue>{subuser.email}</SensitiveValue>
              </>
            ) : (
              "Create new subuser"
            )}
          </h2>
          <div>
            <Button
              type={"submit"}
              className={"w-full sm:w-auto"}
              disabled={methods.formState.isSubmitting}
            >
              {subuser ? "Save" : "Invite User"}
            </Button>
          </div>
        </div>
        <FlashMessageRender byKey={"user:edit"} className={"mt-4"} />
        {!isRootAdmin && loggedInPermissions[0] !== "*" && (
          <div className={"mt-4 border-l-4 border-cyan-400 py-2 pl-4"}>
            <p className={"text-sm text-neutral-300"}>
              Only permissions which your account is currently assigned may be
              selected when creating or modifying other users.
            </p>
          </div>
        )}
        {!subuser && (
          <div className={"mt-6"}>
            <FormField
              id={"email"}
              type={"email"}
              label={"User Email"}
              description={
                "Enter the email address of the user you wish to invite as a subuser for this server."
              }
              error={methods.formState.errors.email}
              {...methods.register("email")}
            />
          </div>
        )}
        <div className={"my-6"}>
          {Object.keys(permissions)
            .filter((key) => key !== "websocket")
            .map((key, index) => (
              <PermissionTitleBox
                key={`permission_${key}`}
                title={key}
                isEditable={canEditUser}
                permissions={Object.keys(permissions[key].keys).map(
                  (pkey) => `${key}.${pkey}`,
                )}
                className={index > 0 ? "mt-4" : undefined}
              >
                <p className={"mb-4 text-sm text-neutral-400"}>
                  {permissions[key].description}
                </p>
                {Object.keys(permissions[key].keys).map((pkey) => (
                  <PermissionRow
                    key={`permission_${key}.${pkey}`}
                    permission={`${key}.${pkey}`}
                    disabled={
                      !canEditUser ||
                      editablePermissions.indexOf(`${key}.${pkey}`) < 0
                    }
                  />
                ))}
              </PermissionTitleBox>
            ))}
        </div>
        <Can action={subuser ? "user.update" : "user.create"}>
          <div className={"flex justify-end pb-6"}>
            <Button
              type={"submit"}
              className={"w-full sm:w-auto"}
              disabled={methods.formState.isSubmitting}
            >
              {subuser ? "Save" : "Invite User"}
            </Button>
          </div>
        </Can>
      </form>
    </FormProvider>
  );
};

export default asModal<Props>({
  top: false,
})(EditSubuserModal);
