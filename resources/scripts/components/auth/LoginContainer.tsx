import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import login from "@/api/auth/login";
import LoginFormContainer from "@/components/auth/LoginFormContainer";
import { useAppStore } from "@/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "@/components/elements/FormField";
import Button from "@/components/elements/Button";
import Captcha, { CaptchaRef } from "@/components/elements/Captcha";
import useFlash from "@/plugins/useFlash";
import { Eye, EyeOff } from "lucide-react";

const schema = z.object({
  username: z.string().min(1, "A username or email must be provided."),
  password: z.string().min(1, "Please enter your account password."),
});

type Values = z.infer<typeof schema>;

const LoginContainer = () => {
  const navigate = useNavigate();
  const ref = useRef<CaptchaRef>(null);
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { clearFlashes, clearAndAddHttpError } = useFlash();
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
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    clearFlashes();
  }, []);

  const onSubmit = async (values: Values) => {
    clearFlashes();

    // If there is no token in the state yet, request the token and then abort this submit request
    // since it will be re-submitted when the recaptcha data is returned by the component.
    if (recaptchaEnabled && !token) {
      try {
        await ref.current!.execute();
      } catch (error) {
        console.error(error);
        clearAndAddHttpError({ error });
      }
      return;
    }

    try {
      const response = await login({ ...values, recaptchaData: token });
      if (response.complete) {
        window.location.assign(response.intended || "/");
        return;
      }

      navigate("/auth/login/checkpoint", {
        replace: true,
        state: { token: response.confirmationToken },
      });
    } catch (error) {
      console.error(error);
      setToken("");
      if (ref.current) ref.current.reset();
      clearAndAddHttpError({ error });
    }
  };

  return (
    <LoginFormContainer
      title={"Welcome back"}
      description={"Sign in to manage your servers."}
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormField
        type={"text"}
        label={"Username or email"}
        autoComplete={"username"}
        autoCapitalize={"none"}
        spellCheck={false}
        disabled={isSubmitting}
        error={errors.username}
        {...register("username")}
      />
      <div className={"password-field mt-5"}>
        <FormField
          type={showPassword ? "text" : "password"}
          label={"Password"}
          autoComplete={"current-password"}
          disabled={isSubmitting}
          error={errors.password}
          {...register("password")}
        />
        <button
          type={"button"}
          className={"password-reveal"}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          disabled={isSubmitting}
          onClick={() => setShowPassword((value) => !value)}
        >
          {showPassword ? (
            <EyeOff size={18} aria-hidden />
          ) : (
            <Eye size={18} aria-hidden />
          )}
        </button>
      </div>
      <div className={"mt-6"}>
        <Button
          type={"submit"}
          size={"xlarge"}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Sign in
        </Button>
      </div>
      {recaptchaEnabled && (
        <Captcha
          ref={ref}
          provider={provider}
          sitekey={siteKey || "_invalid_key"}
          onVerify={(response) => {
            setToken(response);
            void handleSubmit(onSubmit)();
          }}
          onExpire={() => {
            setToken("");
          }}
        />
      )}
      <div>
        <Link to={"/auth/password"} className={"login-recovery"}>
          Forgot password?
        </Link>
      </div>
    </LoginFormContainer>
  );
};

export default LoginContainer;
