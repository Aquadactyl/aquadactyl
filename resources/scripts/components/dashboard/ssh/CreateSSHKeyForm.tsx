import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import Button from "@/components/elements/Button";
import { Textarea } from "@/components/elements/Input";
import { useFlashKey } from "@/plugins/useFlash";
import { createSSHKey, useSSHKeys } from "@/api/account/ssh-keys";
import FormField from "@/components/elements/FormField";
import FormFieldWrapper from "@/components/elements/FormFieldWrapper";

const schema = z.object({
  name: z.string().min(1, "A name must be provided for this SSH key."),
  publicKey: z.string().min(1, "You must provide a public SSH key."),
});

type Values = z.infer<typeof schema>;

export default () => {
  const { clearAndAddHttpError } = useFlashKey("account");
  const { mutate } = useSSHKeys();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", publicKey: "" },
  });

  const onSubmit = async (values: Values) => {
    clearAndAddHttpError();

    try {
      const key = await createSSHKey(values.name, values.publicKey);
      reset();
      mutate((data) => (data || []).concat(key));
    } catch (error) {
      clearAndAddHttpError(error as Error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SpinnerOverlay visible={isSubmitting} />
      <FormField
        id={"name"}
        label={"SSH Key Name"}
        className={"mb-6"}
        disabled={isSubmitting}
        error={errors.name}
        {...register("name")}
      />
      <FormFieldWrapper
        id={"publicKey"}
        label={"Public Key"}
        description={"Enter your public SSH key."}
        error={errors.publicKey}
      >
        <Textarea
          id={"publicKey"}
          className={"h-32"}
          disabled={isSubmitting}
          {...register("publicKey")}
        />
      </FormFieldWrapper>
      <div className={"mt-6 flex justify-end"}>
        <Button disabled={isSubmitting}>Save</Button>
      </div>
    </form>
  );
};
