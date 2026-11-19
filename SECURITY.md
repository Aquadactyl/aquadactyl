# Aquadactyl security policy

Aquadactyl is an independent fork of Pterodactyl Panel with Blueprint bundled.
Upstream support commitments do not apply to changes made in this fork.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/Aquadactyl/aquadactyl/security/advisories/new)
to contact the Aquadactyl maintainers. Private reporting is enabled. Do not open a
public issue or PR containing an exploit, unpatched vulnerability, credentials or
private user data.

Include the exact Panel version or commit, deployment type, affected component,
impact, prerequisites and minimal reproduction steps from an environment you
control. Provide reviewed, redacted evidence. Never send your complete `.env`,
application key, node tokens, session cookies or a database dump.

Manta daemon vulnerabilities belong in
[Manta's private report form](https://github.com/Aquadactyl/manta/security/advisories/new).
Use the [public issue forms](https://github.com/Aquadactyl/aquadactyl/issues/new/choose)
for ordinary bugs, requests and help after reading
[common issues](https://aquadactyl.uk/docs/common-issues).

## Supported releases and disclosure

Current releases are public betas. Security fixes target the
[latest published Panel release](https://github.com/Aquadactyl/aquadactyl/releases)
and the default development branch. Include the original affected version even
if it is older; when possible, check whether it also occurs in a current release.
Panel and Manta versions are independent.

Maintainers assess reports privately, coordinate fixes and publication, and use
GitHub security advisories when appropriate. Keep details private while that
coordination is in progress. Do not test against installations without their
operator's permission.

For vulnerabilities affecting upstream Pterodactyl Panel or Wings, follow the
[upstream security policy](https://github.com/pterodactyl/panel/blob/1.0-develop/SECURITY.md)
and its reporting channels, including security@pterodactyl.io. That address belongs
to Pterodactyl and is not an Aquadactyl contact. Report Blueprint-specific issues
privately to the [Blueprint maintainers](https://github.com/BlueprintFramework/framework).

Run a current, reviewed Aquadactyl release and keep Wings and extensions updated.
See [testing and dependency audits](docs/TESTING.md) for verification commands and
coverage limits.

## Security boundaries

Two-factor checkpoints are bound to the password and authenticator configuration
present when login began. Changing either invalidates pending checkpoints.
Recovery codes are consumed atomically, and TOTP verification records the matched
time step, including codes accepted for clock skew. Verification and configuration
changes serialize against the user record. Account-based attempt limits apply
across client IP addresses and sign-in methods, alongside the IP-based limits.

OAuth callbacks recheck provider configuration after the provider's HTTP requests.
OAuth linking and passkey enrollment verify the current password hash and
suspension status under an account lock before storing a new sign-in method.
Password confirmation shares a limit of ten failed attempts per minute across
account settings and administrator actions, regardless of client IP. A successful
confirmation clears failed attempts; existing route limits also apply.

Daemon, Cloudflare DNS and CAPTCHA requests do not follow redirects with sensitive
request bodies. Configure the final daemon URL and scheme directly; the panel
does not follow an HTTP-to-HTTPS redirect to reach a node. CAPTCHA network failures
reject authentication without exposing provider credentials. Console output is
untrusted input, including links that trigger login prompts.

Release automation accepts `v`-prefixed versions and versioned prerelease tags.
The Docker workflow also permits the exact `canary` tag. Tag metadata is
validated before it is used in shell commands or generated PHP. Invalid tag names
stop the release instead of being interpreted as code.

Blueprint extensions execute PHP, JavaScript and installation scripts with panel
permissions. Administrator confirmation authorizes that code; archive validation
does not sandbox it. Install only extensions you trust. A panel security review
cannot certify arbitrary extensions, custom eggs, daemon installations, host
configuration or future dependency releases.
