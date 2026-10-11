import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/elements/button/index";
import Can from "@/components/elements/Can";
import { ServerContext } from "@/state/server";
import { PowerAction } from "@/components/server/console/ServerConsoleContainer";
import { Dialog } from "@/components/elements/dialog";

import AdditionalPowerButtons from "@blueprint/components/Server/Terminal/AdditionalPowerButtons";

interface PowerButtonProps {
  className?: string;
}

export default ({ className }: PowerButtonProps) => {
  const { t } = usePanelTranslation();
  const [open, setOpen] = useState(false);
  const status = ServerContext.useStoreState((state) => state.status.value);
  const instance = ServerContext.useStoreState(
    (state) => state.socket.instance,
  );

  const killable = status === "stopping";
  const onButtonClick = (
    action: PowerAction | "kill-confirmed",
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ): void => {
    e.preventDefault();
    if (action === "kill") {
      return setOpen(true);
    }

    if (instance) {
      setOpen(false);
      instance.send("set state", action === "kill-confirmed" ? "kill" : action);
    }
  };

  useEffect(() => {
    if (status === "offline") {
      setOpen(false);
    }
  }, [status]);

  return (
    <div className={className}>
      <Dialog.Confirm
        open={open}
        hideCloseIcon
        onClose={() => setOpen(false)}
        title={t("power.forcibly_stop_process", "Forcibly Stop Process")}
        confirm={t("power.continue", "Continue")}
        onConfirmed={onButtonClick.bind(this, "kill-confirmed")}
      >
        {t(
          "power.forcibly_stopping_a_server_can_lead_to_data_corruption",
          "Forcibly stopping a server can lead to data corruption.",
        )}
      </Dialog.Confirm>
      <AdditionalPowerButtons />
      <Can action={"control.start"}>
        <Button
          className={"flex-1"}
          disabled={status !== "offline"}
          onClick={onButtonClick.bind(this, "start")}
        >
          {t("power.start", "Start")}
        </Button>
      </Can>
      <Can action={"control.restart"}>
        <Button.Text
          className={"flex-1"}
          disabled={!status}
          onClick={onButtonClick.bind(this, "restart")}
        >
          {t("power.restart", "Restart")}
        </Button.Text>
      </Can>
      <Can action={"control.stop"}>
        <Button.Danger
          className={"flex-1"}
          disabled={status === "offline"}
          onClick={onButtonClick.bind(this, killable ? "kill" : "stop")}
        >
          {killable ? t("power.kill", "Kill") : t("power.stop", "Stop")}
        </Button.Danger>
      </Can>
    </div>
  );
};
