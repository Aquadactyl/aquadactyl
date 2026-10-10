import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import createApiKey from "@/api/account/createApiKey";
import useFlash from "@/plugins/useFlash";
import { httpErrorToHuman } from "@/api/http";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import { ApiKey } from "@/api/account/getApiKeys";
import Button from "@/components/elements/Button";
import { Textarea } from "@/components/elements/Input";
import ApiKeyModal from "@/components/dashboard/ApiKeyModal";
import FormField from "@/components/elements/FormField";
import FormFieldWrapper from "@/components/elements/FormFieldWrapper";

const schema = z.object({
  allowedIps: z.string().optional(),
  description: z.string().min(4, "Description must be at least 4 characters."),
});

type Values = z.infer<typeof schema>;

export default ({ onKeyCreated }: { onKeyCreated: (key: ApiKey) => void }) => {
  const [apiKey, setApiKey] = useState("");
  const { addError, clearFlashes } = useFlash();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { description: "", allowedIps: "" },
  });

  const onSubmit = async (values: Values) => {
    clearFlashes("account");
    try {
      const { secretToken, ...key } = await createApiKey(
        values.description,
        values.allowedIps || "",
      );
      reset();
      setApiKey(`${key.identifier}${secretToken}`);
      onKeyCreated(key);
    } catch (error) {
      console.error(error);
      addError({ key: "account", message: httpErrorToHuman(error) });
    }
  };

  return (
    <>
      <ApiKeyModal
        visible={apiKey.length > 0}
        onModalDismissed={() => setApiKey("")}
        apiKey={apiKey}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <SpinnerOverlay visible={isSubmitting} />
        <FormField
          id={"description"}
          label={"Description"}
          description={"A description of this API key."}
          className={"mb-6"}
          disabled={isSubmitting}
          error={errors.description}
          {...register("description")}
        />
        <FormFieldWrapper
          id={"allowedIps"}
          label={"Allowed IPs"}
          description={
            "Leave blank to allow any IP address to use this API key, otherwise provide each IP address on a new line."
          }
          error={errors.allowedIps}
        >
          <Textarea
            id={"allowedIps"}
            data-sensitive
            className={"h-32"}
            disabled={isSubmitting}
            {...register("allowedIps")}
          />
        </FormFieldWrapper>
        <div className={"mt-6 flex justify-end"}>
          <Button disabled={isSubmitting}>Create</Button>
        </div>
      </form>
    </>
  );
};
