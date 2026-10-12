import usePanelTranslation from "@/plugins/usePanelTranslation";
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
import {
  getSignInMethods,
  loginWithPasskey,
  passkeysSupported,
  securityError,
  SignInMethods,
} from "@/api/account/security";
import MessageBox from "@/components/MessageBox";
import { httpErrorToHuman } from "@/api/http";

const schema = z.object({
  username: z.string().min(1, "A username or email must be provided."),
  password: z.string().min(1, "Please enter your account password."),
});

type Values = z.infer<typeof schema>;

const LoginContainer = () => {
  const { t } = usePanelTranslation();
  const navigate = useNavigate();
  const ref = useRef<CaptchaRef>(null);
  const [token, setToken] = useState("");
  const tokenRef = useRef("");
  tokenRef.current = token;
  const [methods, setMethods] = useState<SignInMethods | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [methodError, setMethodError] = useState("");

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
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    clearFlashes();
    void getSignInMethods()
      .then((data) => {
        setMethods(data);
        if (data.error) setMethodError(data.error);
        if (data.confirmation_token)
          navigate("/auth/login/checkpoint", {
            replace: true,
            state: { token: data.confirmation_token },
          });
      })
      .catch(() => setMethods(null));
  }, []);

  const onPasskey = async () => {
    setPasskeyBusy(true);
    setMethodError("");
    try {
      const response = await loginWithPasskey();
      if (response.complete) window.location.assign(response.intended || "/");
      else
        navigate("/auth/login/checkpoint", {
          replace: true,
          state: { token: response.confirmationToken },
        });
    } catch (error) {
      setMethodError(httpErrorToHuman(securityError(error)));
    } finally {
      setPasskeyBusy(false);
    }
  };

  const onSubmit = async (values: Values) => {
    if (passkeyBusy) return;
    clearFlashes();
    const currentToken = tokenRef.current || token;

    // If there is no token in the state yet, request the token and then abort this submit request
    // since it will be re-submitted when the recaptcha data is returned by the component.
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
      const response = await login({ ...values, recaptchaData: currentToken });
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
      tokenRef.current = "";
      setToken("");
      if (ref.current) ref.current.reset();
      clearAndAddHttpError({ error });
    }
  };

  return (
    <LoginFormContainer
      title={t("login.welcome_back", "Welcome back")}
      description={t(
        "login.sign_in_to_manage_your_servers",
        "Sign in to manage your servers.",
      )}
      onSubmit={handleSubmit(onSubmit)}
    >
      {methodError && (
        <div className="mb-5">
          <MessageBox type="error" title={t("login.sign_in", "Sign in")}>
            {methodError}
          </MessageBox>
        </div>
      )}
      <FormField
        type={"text"}
        label={t("login.username_or_email", "Username or email")}
        autoComplete={"username"}
        autoCapitalize={"none"}
        spellCheck={false}
        disabled={isSubmitting || passkeyBusy}
        error={errors.username}
        {...register("username")}
      />
      <div className={"mt-5"}>
        <FormField
          id={"password"}
          type={"password"}
          label={t("login.password", "Password")}
          autoComplete={"current-password"}
          disabled={isSubmitting || passkeyBusy}
          error={errors.password}
          {...register("password")}
        />
      </div>
      <div className={"mt-6"}>
        <Button
          type={"submit"}
          size={"xlarge"}
          isLoading={isSubmitting}
          disabled={isSubmitting || passkeyBusy}
        >
          {t("login.sign_in", "Sign in")}
        </Button>
      </div>
      {(methods?.passkeys_enabled || !!methods?.providers.length) && (
        <div className="mt-5 space-y-3 border-t border-neutral-600 pt-5">
          {methods?.passkeys_enabled && passkeysSupported() && (
            <Button
              type="button"
              size="xlarge"
              isSecondary
              disabled={passkeyBusy || isSubmitting}
              isLoading={passkeyBusy}
              onClick={() => void onPasskey()}
            >
              {t("login.sign_in_with_a_passkey", "Sign in with a passkey")}
            </Button>
          )}
          {methods?.providers.map((provider) => (
            <a
              key={provider.id}
              href={`/auth/oauth/${provider.id}`}
              className="block rounded border border-neutral-600 px-4 py-3 text-center text-sm text-neutral-200 hover:border-neutral-400 hover:bg-neutral-700"
            >
              {t("login.continue_with_provider", "Continue with {{provider}}", {
                provider: provider.label,
              })}
            </a>
          ))}
          {!!methods?.providers.length && (
            <p className="text-center text-xs text-neutral-400">
              {t(
                "login.link_your_provider_in_account_settings_before_using_it_to",
                "Link your provider in Account settings before using it to sign in.",
              )}
            </p>
          )}
        </div>
      )}
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
      <div
        className={`mt-5 flex items-center ${
          registrationEnabled ? "justify-between" : "justify-center"
        }`}
      >
        <Link to={"/auth/password"} className={"login-recovery mt-0!"}>
          {t("login.forgot_password", "Forgot password?")}
        </Link>
        {registrationEnabled && (
          <Link to={"/auth/register"} className={"login-recovery mt-0!"}>
            {t("login.create_an_account", "Create an account")}
          </Link>
        )}
      </div>
    </LoginFormContainer>
  );
};

export default LoginContainer;
