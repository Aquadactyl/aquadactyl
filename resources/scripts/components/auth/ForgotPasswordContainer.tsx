import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import requestPasswordResetEmail from "@/api/auth/requestPasswordResetEmail";
import { httpErrorToHuman } from "@/api/http";
import LoginFormContainer from "@/components/auth/LoginFormContainer";
import { useAppStore } from "@/state";
import FormField from "@/components/elements/FormField";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "@/components/elements/Button";
import Captcha, { CaptchaRef } from "@/components/elements/Captcha";
import useFlash from "@/plugins/useFlash";

const schema = z.object({
  email: z
    .string()
    .min(1, "A valid email address must be provided to continue.")
    .email("A valid email address must be provided to continue."),
});

type Values = z.infer<typeof schema>;

export default () => {
  const { t } = usePanelTranslation();
  const ref = useRef<CaptchaRef>(null);
  const [token, setToken] = useState("");
  const tokenRef = useRef("");
  tokenRef.current = token;

  const { clearFlashes, addFlash } = useFlash();
  const recaptchaEnabled = useAppStore(
    (state) => state.settings.data!.recaptcha.enabled,
  );
  const provider = useAppStore(
    (state) => state.settings.data!.recaptcha.provider,
  );
  const siteKey = useAppStore(
    (state) => state.settings.data!.recaptcha.siteKey,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    clearFlashes();
  }, []);

  const handleSubmission = async ({ email }: Values) => {
    clearFlashes();
    const currentToken = tokenRef.current || token;

    // If there is no token in the state yet, request the token and then abort this submit request
    // since it will be re-submitted when the recaptcha data is returned by the component.
    if (recaptchaEnabled && !currentToken) {
      try {
        await ref.current!.execute();
      } catch (error) {
        console.error(error);
        addFlash({
          type: "error",
          title: "Error",
          message: httpErrorToHuman(error),
        });
      }
      return;
    }

    try {
      const response = await requestPasswordResetEmail(email, currentToken);
      reset();
      addFlash({
        type: "success",
        title: "Success",
        message: response,
      });
    } catch (error) {
      console.error(error);
      addFlash({
        type: "error",
        title: "Error",
        message: httpErrorToHuman(error),
      });
    } finally {
      tokenRef.current = "";
      setToken("");
      if (ref.current) ref.current.reset();
    }
  };

  return (
    <LoginFormContainer
      title={t(
        "forgot_password.request_password_reset",
        "Request Password Reset",
      )}
      className={"flex w-full"}
      onSubmit={handleSubmit(handleSubmission)}
    >
      <FormField
        label={t("forgot_password.email", "Email")}
        description={t(
          "forgot_password.enter_your_account_email_address_to_receive_instructions_on_resetting",
          "Enter your account email address to receive instructions on resetting your password.",
        )}
        type={"email"}
        disabled={isSubmitting}
        error={errors.email}
        {...register("email")}
      />
      <div className={"mt-6"}>
        <Button
          type={"submit"}
          size={"xlarge"}
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {t("forgot_password.send_email", "Send Email")}
        </Button>
      </div>
      {recaptchaEnabled && (
        <Captcha
          ref={ref}
          provider={provider}
          sitekey={siteKey || "_invalid_key"}
          onVerify={(response) => {
            tokenRef.current = response;
            setToken(response);
            void handleSubmit(handleSubmission)();
          }}
          onExpire={() => {
            tokenRef.current = "";
            setToken("");
          }}
        />
      )}
      <div className={"mt-6 text-center"}>
        <Link
          to={"/auth/login"}
          className={
            "text-xs tracking-wide text-neutral-400 uppercase no-underline hover:text-neutral-200"
          }
        >
          {t("forgot_password.return_to_login", "Return to Login")}
        </Link>
      </div>
    </LoginFormContainer>
  );
};
