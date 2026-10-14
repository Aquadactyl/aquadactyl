import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/elements/button/index";
import Can from "@/components/elements/Can";
import { ServerContext } from "@/state/server";
import { PowerAction } from "@/components/server/console/ServerConsoleContainer";
import { Dialog } from "@/components/elements/dialog";
import { Play, RotateCw, Square, OctagonX } from "lucide-react";
import clsx from "clsx";

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
    <div className={clsx("console-power-actions", className)}>
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
          className="console-power-button console-power-button--start"
          disabled={status !== "offline"}
          onClick={onButtonClick.bind(this, "start")}
        >
          <Play size={16} aria-hidden />
          <span>{t("power.start", "Start")}</span>
        </Button>
      </Can>
      <Can action={"control.restart"}>
        <Button.Text
          className="console-power-button console-power-button--restart"
          disabled={!status}
          onClick={onButtonClick.bind(this, "restart")}
        >
          <RotateCw size={16} aria-hidden />
          <span>{t("power.restart", "Restart")}</span>
        </Button.Text>
      </Can>
      <Can action={"control.stop"}>
        <Button.Danger
          className={clsx(
            "console-power-button console-power-button--stop",
            killable && "console-power-button--kill",
          )}
          disabled={status === "offline"}
          onClick={onButtonClick.bind(this, killable ? "kill" : "stop")}
        >
          {killable ? (
            <OctagonX size={16} aria-hidden />
          ) : (
            <Square size={16} aria-hidden />
          )}
          <span>
            {killable ? t("power.kill", "Kill") : t("power.stop", "Stop")}
          </span>
        </Button.Danger>
      </Can>
    </div>
  );
};
