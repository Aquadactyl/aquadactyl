# Aquadactyl security policy

Aquadactyl is an independent fork of Pterodactyl Panel with Blueprint bundled.
Upstream support commitments do not apply to changes made in this fork.

## Reporting a vulnerability

Report Aquadactyl-specific vulnerabilities privately to this repository's
maintainers. Use the repository's GitHub Security tab to submit a private report
when that feature is enabled; otherwise arrange a private channel with the
maintainers before sending details. Do not publish sensitive details in issues.
Include the affected Aquadactyl version, reproduction steps and impact.

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
