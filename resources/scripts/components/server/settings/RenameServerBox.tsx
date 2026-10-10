import React from "react";
import { ServerContext } from "@/state/server";
import TitledGreyBox from "@/components/elements/TitledGreyBox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useFlash from "@/plugins/useFlash";
import renameServer from "@/api/server/renameServer";
import FormField from "@/components/elements/FormField";
import FormFieldWrapper from "@/components/elements/FormFieldWrapper";
import { z } from "zod";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import { httpErrorToHuman } from "@/api/http";
import { Button } from "@/components/elements/button/index";
import { Textarea } from "@/components/elements/Input";

const schema = z.object({
  name: z.string().min(1, "A server name must be provided."),
  description: z.string().nullable().optional(),
});

type Values = z.infer<typeof schema>;

export default () => {
  const server = ServerContext.useStoreState((state) => state.server.data!);
  const setServer = ServerContext.useStoreActions(
    (actions) => actions.server.setServer,
  );
  const { addError, clearFlashes } = useFlash();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: server.name,
      description: server.description || "",
    },
  });

  const onSubmit = async ({ name, description }: Values) => {
    clearFlashes("settings");
    try {
      await renameServer(server.uuid, name, description || "");
      setServer({ ...server, name, description: description || "" });
    } catch (error) {
      console.error(error);
      addError({ key: "settings", message: httpErrorToHuman(error) });
    }
  };

  return (
    <TitledGreyBox title={"Change Server Details"} className={"relative"}>
      <SpinnerOverlay visible={isSubmitting} />
      <form className={"mb-0"} onSubmit={handleSubmit(onSubmit)}>
        <FormField
          id={"name"}
          label={"Server Name"}
          type={"text"}
          error={errors.name}
          {...register("name")}
        />
        <div className={"mt-6"}>
          <FormFieldWrapper
            id={"description"}
            label={"Server Description"}
            error={errors.description}
          >
            <Textarea
              id={"description"}
              rows={3}
              disabled={isSubmitting}
              {...register("description")}
            />
          </FormFieldWrapper>
        </div>
        <div className={"mt-6 text-right"}>
          <Button type={"submit"} disabled={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </TitledGreyBox>
  );
};
