import React from "react";
import { useAppStore } from "@/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "@/components/elements/FormField";
import { z } from "zod";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import updateAccountPassword from "@/api/account/updateAccountPassword";
import { httpErrorToHuman } from "@/api/http";
import { Button } from "@/components/elements/button/index";
import useFlash from "@/plugins/useFlash";

const schema = z
  .object({
    current: z.string().min(1, "You must provide your current password."),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.confirmPassword === data.password, {
    message: "Password confirmation does not match the password you entered.",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export default () => {
  const user = useAppStore((state) => state.user.data);
  const { clearFlashes, addFlash } = useFlash();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      current: "",
      password: "",
      confirmPassword: "",
    },
  });

  if (!user) {
    return null;
  }

  const onSubmit = async (values: Values) => {
    clearFlashes("account:password");
    try {
      await updateAccountPassword({ ...values });
      window.location.assign("/auth/login");
    } catch (error) {
      addFlash({
        key: "account:password",
        type: "error",
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
          id={"current_password"}
          type={"password"}
          label={"Current Password"}
          disabled={isSubmitting}
          error={errors.current}
          {...register("current")}
        />
        <div className={"mt-6"}>
          <FormField
            id={"new_password"}
            type={"password"}
            label={"New Password"}
            description={
              "Your new password should be at least 8 characters in length and unique to this website."
            }
            disabled={isSubmitting}
            error={errors.password}
            {...register("password")}
          />
        </div>
        <div className={"mt-6"}>
          <FormField
            id={"confirm_new_password"}
            type={"password"}
            label={"Confirm New Password"}
            disabled={isSubmitting}
            error={errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </div>
        <div className={"mt-6"}>
          <Button disabled={isSubmitting || !isValid}>Update Password</Button>
        </div>
      </form>
    </>
  );
};
