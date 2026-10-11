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
      title="Passkeys and connected accounts"
      description="Add convenient ways to sign in. Your password and two-step verification remain available."
    >
      {error && (
        <MessageBox type="error" title="Sign-in settings">
          {error}
        </MessageBox>
      )}
      {notice && (
        <MessageBox type="success" title="Sign-in settings">
          {notice}
        </MessageBox>
      )}
      {!data ? (
        <p className="mt-3 text-sm text-neutral-400" role="status">
          Loading sign-in methods…
        </p>
      ) : (
        <>
          <div className="mt-4 max-w-lg">
            <FormField
              name="security_current_password"
              type="password"
              label="Confirm your current password"
              autoComplete="current-password"
              value={password}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
              description="Required when adding or removing a sign-in method."
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
              Passkeys
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              Use your device’s fingerprint, face recognition, PIN, or a
              security key.
            </p>
            {data.passkeys.length === 0 && (
              <p className="mt-3 text-sm text-neutral-400">
                You haven’t registered any passkeys yet.
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
                        : "Not used to sign in yet"}
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
                    Remove
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
                    label="Passkey name"
                    value={name}
                    maxLength={100}
                    required
                    placeholder="My phone or security key"
                    disabled={busy}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy || !name.trim()}
                  isLoading={busy}
                >
                  Add passkey
                </Button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-neutral-400">
                {data.passkeys_enabled
                  ? "Use a browser and device that support passkeys over HTTPS."
                  : "Passkey enrolment is unavailable. It requires HTTPS (or localhost) and administrator approval."}
              </p>
            )}
          </section>
          <section
            className="mt-6 border-t border-neutral-600 pt-5"
            aria-labelledby="oauth-heading"
          >
            <h3 id="oauth-heading" className="font-semibold text-neutral-100">
              Connected accounts
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              Link an account here before choosing its provider on the login
              page.
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
                    Unlink
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
                    Link {provider.label}
                  </Button>
                ))}
            </div>
            {data.providers.length === 0 && (
              <p className="mt-3 text-sm text-neutral-400">
                Your administrator hasn’t enabled an OAuth provider.
              </p>
            )}
          </section>
        </>
      )}
    </ContentBox>
  );
}
