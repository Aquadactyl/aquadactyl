import React, { useState } from "react";
import deleteSchedule from "@/api/server/schedules/deleteSchedule";
import { ServerContext } from "@/state/server";
import useFlash from "@/plugins/useFlash";
import { httpErrorToHuman } from "@/api/http";
import { Button } from "@/components/elements/button/index";
import { Dialog } from "@/components/elements/dialog";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";

interface Props {
  scheduleId: number;
  onDeleted: () => void;
}

export default ({ scheduleId, onDeleted }: Props) => {
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const { addError, clearFlashes } = useFlash();
  const removeSchedule = ServerContext.useStoreActions(
    (actions) => actions.schedules.removeSchedule,
  );

  const onDelete = () => {
    setIsLoading(true);
    clearFlashes("schedules");
    deleteSchedule(uuid, scheduleId)
      .then(() => {
        removeSchedule(scheduleId);
        setIsLoading(false);
        onDeleted();
      })
      .catch((error) => {
        console.error(error);

        addError({
          key: "schedules",
          message: httpErrorToHuman(error),
        });
        setIsLoading(false);
        setVisible(false);
      });
  };

  return (
    <>
      <Dialog.Confirm
        open={visible}
        onClose={() => setVisible(false)}
        title={"Delete Schedule"}
        confirm={"Delete"}
        onConfirmed={onDelete}
      >
        <SpinnerOverlay visible={isLoading} />
        This deletes the schedule and all its steps. Your server will keep
        running.
      </Dialog.Confirm>
      <Button.Danger
        variant={Button.Variants.Secondary}
        className={"mr-4 flex-1 border-transparent sm:flex-none"}
        onClick={() => setVisible(true)}
      >
        Delete
      </Button.Danger>
    </>
  );
};
