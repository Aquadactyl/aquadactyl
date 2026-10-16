# Passkeys and OAuth

Aquadactyl supports passkeys and linked Discord, GitHub, Google, and OpenID Connect
accounts for existing panel users, including administrators. These methods use the
same account permissions and two-step verification checkpoint as password login.

## Configure the panel

After updating the panel, install the locked Composer dependencies, run
`php artisan migrate --force`, and rebuild the frontend with `pnpm build`.
The Docker image installs dependencies and builds assets; its startup runs migrations.

Set `APP_URL` to the exact public panel address. Use HTTPS in production.
Passkeys work on HTTP only at `localhost`, including `http://localhost:8081`.
An HTTP IP address or custom hostname cannot enrol passkeys. Registering at one
hostname does not make a passkey available on another. Changing the hostname
requires users to sign in with another method and enrol new passkeys.

Open **Admin → Settings → OAuth**. Passkeys are enabled by default when the panel
address is suitable. Disabling them blocks enrolment and sign-in and hides the
passkeys section in Account settings. Registered keys are retained and become
available again after re-enabling the feature.

Create an OAuth application with each provider you want to enable. Enter its client
ID and secret, and register the exact callback URL displayed in the OAuth tab:

| Provider       | Callback path                  | Requested scopes       |
| -------------- | ------------------------------ | ---------------------- |
| Discord        | `/auth/oauth/discord/callback` | `identify email`       |
| GitHub         | `/auth/oauth/github/callback`  | `user:email`           |
| Google         | `/auth/oauth/google/callback`  | `openid profile email` |
| OpenID Connect | `/auth/oauth/oidc/callback`    | `openid profile email` |

Callback URLs use `APP_URL`'s origin. Local testing and production applications need
their respective callback URLs. Google applications in testing mode may require
adding permitted test users in the provider's console.

For OpenID Connect, enter the provider's exact HTTPS issuer URL and an optional
button label. The issuer must publish discovery at
`<issuer>/.well-known/openid-configuration`, provide HTTPS authorization, token and
JWKS endpoints, support PKCE S256, and sign ID tokens with RS256 or ES256.
Both `client_secret_basic` and `client_secret_post` are supported; other token client
authentication methods are not supported. Preserve any trailing slash in the issuer
if it appears in the provider's discovery document. Discovery and signing keys are
cached for five minutes, so new signing keys should be published before rotation.

Confirm your current administrator password to save settings. Client secrets are
encrypted using the panel's application key and never shown again. Leave a secret
field blank to retain it. Disable the provider and tick “Clear the saved secret”
to remove its credentials. Retain the existing application key when updating.
OAuth and passkey settings are stored in the database, including when other panel
settings use `APP_ENVIRONMENT_ONLY=true`.

## Set up an account

Sign in using your existing password and open **Account settings → Passkeys and
connected accounts**. Confirm your current password before changing sign-in methods.

Account settings only shows methods enabled by the administrator. The connected
accounts section appears when at least one OAuth provider is enabled and has its
required credentials configured, including an issuer for OpenID Connect. Disabled
providers and their existing connections are hidden; saved connections are retained
for re-enabling later. If only passkeys or OAuth is available, the card uses that
method's title. If neither is available, the card is hidden.

The profile picture and privacy sections are also hidden when their features are
disabled in **Admin → Settings → General**. Existing account preferences are kept.

- Give a passkey a recognizable name, select **Add passkey**, and follow your device's
  prompt. A fingerprint, face recognition, device PIN, or security key may be used.
- Select **Link Discord**, **Link GitHub**, **Link Google**, or your configured OpenID
  Connect provider. Authorize the account in the provider's window and return to
  the panel. Each provider can be linked once to an account.
- Use **Remove** or **Unlink** with your current password to revoke a method.

The login page offers passkeys on supported browsers and buttons for enabled OAuth
providers. If two-step verification is enabled, complete the normal authenticator
or recovery-code checkpoint after either method. Passkeys do not bypass that policy.
Keep your password and two-step recovery codes available in case a device or provider
becomes unavailable. Lost passkeys can be removed after signing in using another method.

OAuth does not create panel users or link accounts by matching email addresses.
An unlinked provider returns an instruction to sign in with a password and link it
in Account settings. The link uses the provider's stable account identifier; OIDC
links also include the issuer. A provider account cannot belong to two panel users.
Changing an OIDC issuer requires unlinking the old connection and linking the new one.
OAuth access and refresh tokens are not retained in the panel database.

## Verification

OpenID Connect discovery and signing-key downloads are streamed with a 1 MiB
limit on decoded JSON, a ten-second download budget and a five-second idle-read
timeout. Redirects remain disabled. Oversized, stalled, invalid and excessively
nested documents are rejected, and response streams are closed on success and
failure. These limits apply to discovery/JWKS documents.

The integration tests use a software authenticator with real ES256 signatures and
mock provider HTTP responses with real signed OIDC tokens. They cover origin,
challenge, signature, user verification, replay, counters, session binding, state,
PKCE, nonce, issuer, audience, account ownership, encrypted secrets, and the native
two-factor checkpoint. External provider sign-in also needs real application
credentials and a callback URL reachable from the user's browser.

```bash
vendor/bin/pest tests/Integration/Http/Controllers/Auth tests/Integration/Http/Controllers/Admin/Settings/OAuthControllerTest.php
pnpm exec vitest run resources/scripts/api/account/security.spec.ts
pnpm types
pnpm build
```
