import React, { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import performPasswordReset from "@/api/auth/performPasswordReset";
import { httpErrorToHuman } from "@/api/http";
import LoginFormContainer from "@/components/auth/LoginFormContainer";
import useFlash from "@/plugins/useFlash";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "@/components/elements/FormField";
import Input from "@/components/elements/Input";
import Button from "@/components/elements/Button";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Your new password should be at least 8 characters in length."),
    passwordConfirmation: z
      .string()
      .min(1, "Your new password does not match."),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Your new password does not match.",
    path: ["passwordConfirmation"],
  });

type Values = z.infer<typeof schema>;

export default () => {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const [email, setEmail] = useState("");

  const { clearFlashes, addFlash } = useFlash();

  const parsed = new URLSearchParams(location.search);
  if (email.length === 0 && parsed.get("email")) {
    setEmail(parsed.get("email") || "");
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      passwordConfirmation: "",
    },
  });

  const onSubmit = async ({ password, passwordConfirmation }: Values) => {
    clearFlashes();
    try {
      await performPasswordReset(email, {
        token: token || "",
        password,
        passwordConfirmation,
      });
      window.location.assign("/");
    } catch (error) {
      console.error(error);
      addFlash({
        type: "error",
        title: "Error",
        message: httpErrorToHuman(error),
      });
    }
  };

  return (
    <LoginFormContainer
      title={"Reset Password"}
      className={"flex w-full"}
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <label>Email</label>
        <Input value={email} disabled />
      </div>
      <div className={"mt-6"}>
        <FormField
          label={"New Password"}
          type={"password"}
          description={"Passwords must be at least 8 characters in length."}
          disabled={isSubmitting}
          error={errors.password}
          {...register("password")}
        />
      </div>
      <div className={"mt-6"}>
        <FormField
          label={"Confirm New Password"}
          type={"password"}
          disabled={isSubmitting}
          error={errors.passwordConfirmation}
          {...register("passwordConfirmation")}
        />
      </div>
      <div className={"mt-6"}>
        <Button
          size={"xlarge"}
          type={"submit"}
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          Reset Password
        </Button>
      </div>
      <div className={"mt-6 text-center"}>
        <Link
          to={"/auth/login"}
          className={
            "text-xs tracking-wide text-neutral-400 uppercase no-underline hover:text-neutral-200"
          }
        >
          Return to Login
        </Link>
      </div>
    </LoginFormContainer>
  );
};
