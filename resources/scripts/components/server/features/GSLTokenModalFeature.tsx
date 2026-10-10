import React, { useEffect, useState } from "react";
import { ServerContext } from "@/state/server";
import Modal from "@/components/elements/Modal";
import Button from "@/components/elements/Button";
import FlashMessageRender from "@/components/FlashMessageRender";
import useFlash from "@/plugins/useFlash";
import { SocketEvent, SocketRequest } from "@/components/server/events";
import FormField from "@/components/elements/FormField";
import updateStartupVariable from "@/api/server/updateStartupVariable";
import { useForm } from "react-hook-form";

interface Values {
  gslToken: string;
}

const GSLTokenModalFeature = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const status = ServerContext.useStoreState((state) => state.status.value);
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const { connected, instance } = ServerContext.useStoreState(
    (state) => state.socket,
  );

  const { register, handleSubmit } = useForm<Values>({
    defaultValues: { gslToken: "" },
  });

  useEffect(() => {
    if (!connected || !instance || status === "running") return;

    const errors = ["(gsl token expired)", "(account not found)"];

    const listener = (line: string) => {
      if (errors.some((p) => line.toLowerCase().includes(p))) {
        setVisible(true);
      }
    };

    instance.addListener(SocketEvent.CONSOLE_OUTPUT, listener);

    return () => {
      instance.removeListener(SocketEvent.CONSOLE_OUTPUT, listener);
    };
  }, [connected, instance, status]);

  const updateGSLToken = async (values: Values) => {
    setLoading(true);
    clearFlashes("feature:gslToken");

    try {
      await updateStartupVariable(uuid, "STEAM_ACC", values.gslToken);
      if (instance) {
        instance.send(SocketRequest.SET_STATE, "restart");
      }
      setLoading(false);
      setVisible(false);
    } catch (error) {
      console.error(error);
      clearAndAddHttpError({ key: "feature:gslToken", error });
      setLoading(false);
    }
  };

  useEffect(() => {
    clearFlashes("feature:gslToken");
  }, []);

  return (
    <Modal
      visible={visible}
      onDismissed={() => setVisible(false)}
      closeOnBackground={false}
      showSpinnerOverlay={loading}
    >
      <FlashMessageRender key={"feature:gslToken"} className={"mb-4"} />
      <form onSubmit={handleSubmit(updateGSLToken)}>
        <h2 className={"mb-4 text-2xl text-neutral-100"}>Invalid GSL token!</h2>
        <p className={"mt-4"}>
          It seems like your Gameserver Login Token (GSL token) is invalid or
          has expired.
        </p>
        <p className={"mt-4"}>
          You can either generate a new one and enter it below or leave the field
          blank to remove it completely.
        </p>
        <div className={"mt-4 items-center sm:flex"}>
          <FormField
            id={"gslToken"}
            label={"GSL Token"}
            description={
              "Visit https://steamcommunity.com/dev/managegameservers to generate a token."
            }
            autoFocus
            {...register("gslToken")}
          />
        </div>
        <div className={"mt-8 items-center justify-end sm:flex"}>
          <Button
            type={"submit"}
            className={"mt-4 w-full sm:mt-0 sm:ml-4 sm:w-auto"}
            disabled={loading}
          >
            Update GSL Token
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default GSLTokenModalFeature;
