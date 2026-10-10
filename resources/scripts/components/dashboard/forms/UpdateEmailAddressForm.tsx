import React from "react";
import { useAppStore } from "@/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import FormField from "@/components/elements/FormField";
import { httpErrorToHuman } from "@/api/http";
import { Button } from "@/components/elements/button/index";
import useFlash from "@/plugins/useFlash";

const schema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(1, "You must provide your current account password."),
});

type Values = z.infer<typeof schema>;

export default () => {
  const user = useAppStore((state) => state.user.data);
  const updateEmail = useAppStore((state) => state.user.updateUserEmail);
  const { clearFlashes, addFlash } = useFlash();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { email: user!.email, password: "" },
  });

  const onSubmit = async (values: Values) => {
    clearFlashes("account:email");

    try {
      await updateEmail({ ...values });
      addFlash({
        type: "success",
        key: "account:email",
        message: "Your primary email has been updated.",
      });
      reset({ email: values.email, password: "" });
    } catch (error) {
      addFlash({
        type: "error",
        key: "account:email",
        title: "Error",
        message: httpErrorToHuman(error),
      });
    }
  };

  return (
    <>
      <SpinnerOverlay size={"large"} visible={isSubmitting} />
      <form className={"m-0"} onSubmit={handleSubmit(onSubmit)}>
        <FormField
          id={"current_email"}
          type={"email"}
          label={"Email"}
          disabled={isSubmitting}
          error={errors.email}
          {...register("email")}
        />
        <div className={"mt-6"}>
          <FormField
            id={"confirm_password"}
            type={"password"}
            label={"Confirm Password"}
            disabled={isSubmitting}
            error={errors.password}
            {...register("password")}
          />
        </div>
        <div className={"mt-6"}>
          <Button disabled={isSubmitting || !isValid}>Update Email</Button>
        </div>
      </form>
    </>
  );
};
