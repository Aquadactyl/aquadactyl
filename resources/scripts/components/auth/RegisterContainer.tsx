import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import registerApi from "@/api/auth/register";
import LoginFormContainer from "@/components/auth/LoginFormContainer";
import { useAppStore } from "@/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "@/components/elements/FormField";
import Button from "@/components/elements/Button";
import Captcha, { CaptchaRef } from "@/components/elements/Captcha";
import useFlash from "@/plugins/useFlash";

const schema = z
  .object({
    username: z
      .string()
      .min(1, "A username must be provided.")
      .max(191, "Username may not exceed 191 characters.")
      .regex(
        /^[a-zA-Z0-9_\-.]+$/,
        "Username must only contain letters, numbers, hyphens, underscores, or periods.",
      ),
    email: z
      .string()
      .min(1, "An email address must be provided.")
      .email("A valid email address must be provided."),
    name_first: z
      .string()
      .min(1, "First name must be provided.")
      .max(191, "First name may not exceed 191 characters."),
    name_last: z
      .string()
      .min(1, "Last name must be provided.")
      .max(191, "Last name may not exceed 191 characters."),
    password: z.string().min(8, "Password must be at least 8 characters long."),
    password_confirmation: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

type Values = z.infer<typeof schema>;

const RegisterContainer = () => {
  const { t } = usePanelTranslation();
  const navigate = useNavigate();
  const ref = useRef<CaptchaRef>(null);
  const [token, setToken] = useState("");
  const tokenRef = useRef("");
  tokenRef.current = token;

  const { clearFlashes, clearAndAddHttpError } = useFlash();

  const registrationEnabled = useAppStore(
    (state) => state.settings.data?.features?.registration ?? false,
  );
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
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      email: "",
      name_first: "",
      name_last: "",
      password: "",
      password_confirmation: "",
    },
  });

  useEffect(() => {
    clearFlashes();
  }, []);

  useEffect(() => {
    if (!registrationEnabled) {
      navigate("/auth/login", { replace: true });
    }
  }, [registrationEnabled, navigate]);

  const onSubmit = async (values: Values) => {
    clearFlashes();
    const currentToken = tokenRef.current || token;

    if (recaptchaEnabled && !currentToken) {
      try {
        await ref.current!.execute();
      } catch (error) {
        console.error(error);
        clearAndAddHttpError({ error });
      }
      return;
    }

    try {
      const response = await registerApi({
        ...values,
        recaptchaData: currentToken,
      });
      if (response.complete) {
        window.location.assign(response.intended || "/");
        return;
      }

      navigate("/auth/login");
    } catch (error) {
      console.error(error);
      tokenRef.current = "";
      setToken("");
      if (ref.current) ref.current.reset();
      clearAndAddHttpError({ error });
    }
  };

  return (
    <LoginFormContainer
      title={t("register.create_an_account", "Create an account")}
      description={t(
        "register.sign_up_to_start_managing_your_servers",
        "Sign up to start managing your servers.",
      )}
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormField
        type={"text"}
        label={t("register.username", "Username")}
        autoComplete={"username"}
        autoCapitalize={"none"}
        spellCheck={false}
        disabled={isSubmitting}
        error={errors.username}
        {...register("username")}
      />
      <div className={"mt-5"}>
        <FormField
          type={"email"}
          label={t("register.email_address", "Email address")}
          autoComplete={"email"}
          autoCapitalize={"none"}
          spellCheck={false}
          disabled={isSubmitting}
          error={errors.email}
          {...register("email")}
        />
      </div>
      <div className={"mt-5 grid grid-cols-2 gap-4"}>
        <FormField
          type={"text"}
          label={t("register.first_name", "First name")}
          autoComplete={"given-name"}
          disabled={isSubmitting}
          error={errors.name_first}
          {...register("name_first")}
        />
        <FormField
          type={"text"}
          label={t("register.last_name", "Last name")}
          autoComplete={"family-name"}
          disabled={isSubmitting}
          error={errors.name_last}
          {...register("name_last")}
        />
      </div>
      <div className={"mt-5"}>
        <FormField
          id={"password"}
          type={"password"}
          label={t("register.password", "Password")}
          autoComplete={"new-password"}
          disabled={isSubmitting}
          error={errors.password}
          {...register("password")}
        />
      </div>
      <div className={"mt-5"}>
        <FormField
          id={"password_confirmation"}
          type={"password"}
          label={t("register.confirm_password", "Confirm password")}
          autoComplete={"new-password"}
          disabled={isSubmitting}
          error={errors.password_confirmation}
          {...register("password_confirmation")}
        />
      </div>
      <div className={"mt-6"}>
        <Button
          type={"submit"}
          size={"xlarge"}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {t("register.create_account", "Create account")}
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
            void handleSubmit(onSubmit)();
          }}
          onExpire={() => {
            tokenRef.current = "";
            setToken("");
          }}
        />
      )}
      <div className={"mt-5 text-center"}>
        <Link to={"/auth/login"} className={"login-recovery mt-0!"}>
          {t(
            "register.already_have_an_account_sign_in",
            "Already have an account? Sign in",
          )}
        </Link>
      </div>
    </LoginFormContainer>
  );
};

export default RegisterContainer;
