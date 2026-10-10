import React, { useState } from "react";
import ConfirmationModal from "@/components/elements/ConfirmationModal";
import { ServerContext } from "@/state/server";
import { Trash2 } from "lucide-react";
import { Subuser } from "@/state/server/subusers";
import deleteSubuser from "@/api/server/users/deleteSubuser";
import useFlash from "@/plugins/useFlash";
import { httpErrorToHuman } from "@/api/http";

export default ({ subuser }: { subuser: Subuser }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const removeSubuser = ServerContext.useStoreActions(
    (actions) => actions.subusers.removeSubuser,
  );
  const { addError, clearFlashes } = useFlash();

  const doDeletion = () => {
    setLoading(true);
    clearFlashes("users");
    deleteSubuser(uuid, subuser.uuid)
      .then(() => {
        setLoading(false);
        removeSubuser(subuser.uuid);
      })
      .catch((error) => {
        console.error(error);
        addError({ key: "users", message: httpErrorToHuman(error) });
        setShowConfirmation(false);
      });
  };

  return (
    <>
      <ConfirmationModal
        title={"Delete this subuser?"}
        buttonText={"Yes, remove subuser"}
        visible={showConfirmation}
        showSpinnerOverlay={loading}
        onConfirmed={() => doDeletion()}
        onModalDismissed={() => setShowConfirmation(false)}
      >
        Are you sure you wish to remove this subuser? They will have all access
        to this server revoked immediately.
      </ConfirmationModal>
      <button
        type={"button"}
        aria-label={"Delete subuser"}
        className={
          "block cursor-pointer p-2 text-sm text-neutral-500 transition-colors duration-150 hover:text-red-600"
        }
        onClick={() => setShowConfirmation(true)}
      >
        <Trash2 size={16} />
      </button>
    </>
  );
};
