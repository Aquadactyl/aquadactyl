import SensitiveValue from "@/components/elements/SensitiveValue";
import React, { useState } from "react";
import { Subuser } from "@/state/server/subusers";
import { Lock, Unlock, Pencil } from "lucide-react";
import RemoveSubuserButton from "@/components/server/users/RemoveSubuserButton";
import EditSubuserModal from "@/components/server/users/EditSubuserModal";
import Can from "@/components/elements/Can";
import { useAppStore } from "@/state";
import GreyRowBox from "@/components/elements/GreyRowBox";

interface Props {
  subuser: Subuser;
}

export default ({ subuser }: Props) => {
  const uuid = useAppStore((state) => state.user!.data!.uuid);
  const [visible, setVisible] = useState(false);

  return (
    <GreyRowBox className={"mb-2"}>
      <EditSubuserModal
        subuser={subuser}
        visible={visible}
        onModalDismissed={() => setVisible(false)}
      />
      <div
        className={
          "hidden h-10 w-10 overflow-hidden rounded-full border-2 border-neutral-800 bg-white md:block"
        }
      >
        <img className={"h-full w-full"} src={`${subuser.image}?s=400`} />
      </div>
      <div className={"ml-4 flex-1 overflow-hidden"}>
        <p className={"truncate text-sm"}>
          <SensitiveValue>{subuser.email}</SensitiveValue>
        </p>
      </div>
      <div className={"ml-4"}>
        <div className={"flex justify-center"}>
          {subuser.twoFactorEnabled ? (
            <Lock className={"h-4 w-4 text-neutral-300"} />
          ) : (
            <Unlock className={"h-4 w-4 text-red-400"} />
          )}
        </div>
        <p className={"text-2xs hidden text-neutral-500 uppercase md:block"}>
          2FA Enabled
        </p>
      </div>
      <div className={"ml-4 hidden md:block"}>
        <p className={"text-center font-medium"}>
          {
            subuser.permissions.filter(
              (permission) => permission !== "websocket.connect",
            ).length
          }
        </p>
        <p className={"text-2xs text-neutral-500 uppercase"}>Permissions</p>
      </div>
      {subuser.uuid !== uuid && (
        <>
          <Can action={"user.update"}>
            <button
              type={"button"}
              aria-label={"Edit subuser"}
              className={
                "mx-4 block cursor-pointer p-1 text-sm text-neutral-500 transition-colors duration-150 hover:text-neutral-100 md:p-2"
              }
              onClick={() => setVisible(true)}
            >
              <Pencil size={16} />
            </button>
          </Can>
          <Can action={"user.delete"}>
            <RemoveSubuserButton subuser={subuser} />
          </Can>
        </>
      )}
    </GreyRowBox>
  );
};
