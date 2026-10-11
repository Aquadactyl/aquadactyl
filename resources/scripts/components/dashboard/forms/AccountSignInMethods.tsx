import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect, useState } from "react";
import ContentBox from "@/components/elements/ContentBox";
import FormField from "@/components/elements/FormField";
import Button from "@/components/elements/Button";
import MessageBox from "@/components/MessageBox";
import { httpErrorToHuman } from "@/api/http";
import {
  AccountSecurity,
  getAccountSecurity,
  linkOAuthProvider,
  passkeysSupported,
  registerPasskey,
  removeSignInMethod,
  securityError,
} from "@/api/account/security";

export default function AccountSignInMethods() {
  const { t } = usePanelTranslation();
  const [data, setData] = useState<AccountSecurity | null>(null);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    const result = await getAccountSecurity();
    setData(result);
    if (result.error) setError(result.error);
    if (result.notice) setNotice(result.notice);
  };
  useEffect(() => {
    void refresh().catch((error) => setError(httpErrorToHuman(error)));
  }, []);

  const perform = async (action: () => Promise<void>, message: string) => {
    if (!password) {
      setError("Enter your current password to change sign-in methods.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setPassword("");
      setNotice(message);
      await refresh();
    } catch (error) {
      setError(httpErrorToHuman(securityError(error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ContentBox
      className="mt-6"
      title={t(
        "sign_in_methods.passkeys_and_connected_accounts",
        "Passkeys and connected accounts",
      )}
      description={t(
        "sign_in_methods.add_convenient_ways_to_sign_in_your_password_and_two",
        "Add convenient ways to sign in. Your password and two-step verification remain available.",
      )}
    >
      {error && (
        <MessageBox
          type="error"
          title={t("sign_in_methods.sign_in_settings", "Sign-in settings")}
        >
          {error}
        </MessageBox>
      )}
      {notice && (
        <MessageBox
          type="success"
          title={t("sign_in_methods.sign_in_settings", "Sign-in settings")}
        >
          {notice}
        </MessageBox>
      )}
      {!data ? (
        <p className="mt-3 text-sm text-neutral-400" role="status">
          {t(
            "sign_in_methods.loading_sign_in_methods",
            "Loading sign-in methods…",
          )}
        </p>
      ) : (
        <>
          <div className="mt-4 max-w-lg">
            <FormField
              name="security_current_password"
              type="password"
              label={t(
                "sign_in_methods.confirm_your_current_password",
                "Confirm your current password",
              )}
              autoComplete="current-password"
              value={password}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
              description={t(
                "sign_in_methods.required_when_adding_or_removing_a_sign_in_method",
                "Required when adding or removing a sign-in method.",
              )}
            />
          </div>
          <section
            className="mt-6 border-t border-neutral-600 pt-5"
            aria-labelledby="passkeys-heading"
          >
            <h3
              id="passkeys-heading"
              className="font-semibold text-neutral-100"
            >
              {t("sign_in_methods.passkeys", "Passkeys")}
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              {t(
                "sign_in_methods.use_your_device_s_fingerprint_face_recognition_pin_or_a",
                "Use your device’s fingerprint, face recognition, PIN, or a security key.",
              )}
            </p>
            {data.passkeys.length === 0 && (
              <p className="mt-3 text-sm text-neutral-400">
                {t(
                  "sign_in_methods.you_haven_t_registered_any_passkeys_yet",
                  "You haven’t registered any passkeys yet.",
                )}
              </p>
            )}
            <ul className="mt-3 space-y-3">
              {data.passkeys.map((key) => (
                <li
                  key={key.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-600 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words text-neutral-100">
                      {key.name}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {key.last_used_at
                        ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}`
                        : t(
                            "sign_in_methods.not_used_to_sign_in_yet",
                            "Not used to sign in yet",
                          )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    color="red"
                    isSecondary
                    disabled={busy}
                    aria-label={`Remove passkey ${key.name}`}
                    onClick={() =>
                      void perform(
                        () => removeSignInMethod("passkeys", key.id, password),
                        "Passkey removed.",
                      )
                    }
                  >
                    {t("sign_in_methods.remove", "Remove")}
                  </Button>
                </li>
              ))}
            </ul>
            {data.passkeys_enabled && passkeysSupported() ? (
              <form
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform(
                    () => registerPasskey(name.trim(), password),
                    "Passkey added.",
                  );
                }}
              >
                <div className="min-w-0 flex-1">
                  <FormField
                    name="passkey_name"
                    label={t("sign_in_methods.passkey_name", "Passkey name")}
                    value={name}
                    maxLength={100}
                    required
                    placeholder={t(
                      "sign_in_methods.my_phone_or_security_key",
                      "My phone or security key",
                    )}
                    disabled={busy}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy || !name.trim()}
                  isLoading={busy}
                >
                  {t("sign_in_methods.add_passkey", "Add passkey")}
                </Button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-neutral-400">
                {data.passkeys_enabled
                  ? t(
                      "sign_in_methods.use_a_browser_and_device_that_support_passkeys_over_https",
                      "Use a browser and device that support passkeys over HTTPS.",
                    )
                  : t(
                      "sign_in_methods.passkey_enrolment_is_unavailable_it_requires_https_or_localhost_and",
                      "Passkey enrolment is unavailable. It requires HTTPS (or localhost) and administrator approval.",
                    )}
              </p>
            )}
          </section>
          <section
            className="mt-6 border-t border-neutral-600 pt-5"
            aria-labelledby="oauth-heading"
          >
            <h3 id="oauth-heading" className="font-semibold text-neutral-100">
              {t("sign_in_methods.connected_accounts", "Connected accounts")}
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              {t(
                "sign_in_methods.link_an_account_here_before_choosing_its_provider_on_the",
                "Link an account here before choosing its provider on the login page.",
              )}
            </p>
            <ul className="mt-3 space-y-3">
              {data.identities.map((identity) => (
                <li
                  key={identity.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-600 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-100">
                      {data.providers.find(
                        (provider) => provider.id === identity.provider,
                      )?.label ||
                        {
                          discord: "Discord",
                          github: "GitHub",
                          google: "Google",
                          oidc: "OpenID Connect",
                        }[identity.provider] ||
                        identity.provider}
                    </p>
                    <p className="mt-1 text-xs break-words text-neutral-400">
                      {identity.display_name}
                    </p>
                  </div>
                  <Button
                    type="button"
                    color="red"
                    isSecondary
                    disabled={busy}
                    aria-label={`Unlink ${identity.provider}`}
                    onClick={() =>
                      void perform(
                        () =>
                          removeSignInMethod("oauth", identity.id, password),
                        "Connected account removed.",
                      )
                    }
                  >
                    {t("sign_in_methods.unlink", "Unlink")}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              {data.providers
                .filter(
                  (provider) =>
                    !data.identities.some(
                      (identity) => identity.provider === provider.id,
                    ),
                )
                .map((provider) => (
                  <Button
                    type="button"
                    key={provider.id}
                    isSecondary
                    disabled={busy}
                    onClick={() =>
                      void perform(
                        () => linkOAuthProvider(provider.id, password),
                        "",
                      )
                    }
                  >
                    {t("sign_in_methods.link", "Link")} {provider.label}
                  </Button>
                ))}
            </div>
            {data.providers.length === 0 && (
              <p className="mt-3 text-sm text-neutral-400">
                {t(
                  "sign_in_methods.your_administrator_hasn_t_enabled_an_oauth_provider",
                  "Your administrator hasn’t enabled an OAuth provider.",
                )}
              </p>
            )}
          </section>
        </>
      )}
    </ContentBox>
  );
}
