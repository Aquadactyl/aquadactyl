<!-- markdownlint-disable MD024 -->

# Changelog

Aquadactyl release notes.

This project follows [Semantic Versioning](http://semver.org) guidelines.

## Unreleased (Aquadactyl)

### Added

- Manual GitHub release workflow dispatch (`workflow_dispatch`) with inputs for version tags and prerelease status, automatically normalising release tags and creating matching release branch targets.
- Read-only Ace editor integration for the admin Laravel log viewer (`admin/settings/logs`) with line numbers, interactive search dialog, line wrapping toggle, and automatic scroll-to-end.
- Dark theme support for the Ace editor (`tomorrow_night` and `monokai`), setting dark mode by default for egg installation scripts and the Laravel log viewer to match the panel's dark palette.

### Changed

- Modernized admin panel JavaScript across `public/themes/pterodactyl/js/admin/`, refactoring legacy scripts to modern ES2022+ syntax, arrow functions, and native browser APIs.
- Replaced third-party animation and scrolling plugins (`animate.css`, `font-awesome-animation`, and `jquery.slimscroll`) with modern CSS keyframes and native scroll container styling.
- Enhanced user management forms with standard autocomplete attributes and updated engine versions for Node.js and pnpm.

### Removed

- Pruned 41 unused syntax modes, worker scripts, and extensions from the Ace editor vendor bundle, reducing directory size by over 80%.
- Removed legacy `jquery.slimscroll.min.js` and `bootstrap-notify.min.js` vendor libraries from the administration layout in favour of native browser APIs and built-in toast notifications.
- Removed all legacy pre-Aquadactyl changelog entries prior to `v0.1-beta`.

### Validation

- 2,266 PHP unit and integration tests (30,511 assertions) pass with 100% executable line coverage.
- Standalone admin security tests, Blueprint compatibility preflight checks, and release tag boundary checks pass with 0 errors.

## v0.3-beta

### Added

- First-run administrator setup for site name, logo and primary colour, with optional location/node creation, authenticated daemon connection checks and additional administrator accounts. Existing installations can revisit setup without resetting their configuration.
- Installable PWA with branded icons, English/French/German offline connection pages, and an admin Settings > PWA tab for installation, offline support and app names. Offline caches contain public connection pages only.
- Toast notifications, an account notification inbox, and opt-in preferences for server power actions, schedules, backups, installations and supported crash events. Administrators control availability and optional personal Discord webhooks.

### Changed

- Update notes are collapsed by default in the administration overview and Updates settings. Expanded notes scroll within a bounded area and continue to match the installed GitHub release.
- Disabling PWA or offline support retires the panel's worker and offline caches while preserving unrelated addon workers and caches. Existing device shortcuts cannot be removed remotely.
- Schedule notifications distinguish skipped offline runs from failed runs. Notification delivery checks current permissions and admin policy, encrypts webhook URLs, and uses queued retries and retention cleanup.

### Updating

- Apply database migrations, rebuild frontend assets and restart queue workers. Keep the minute scheduler and workers for the high, standard and low queues running.
- Admin-managed PWA settings require database-backed settings (`APP_ENVIRONMENT_ONLY=false`). Environment-only deployments can use the documented `AQUADACTYL_PWA_*` variables.
- Crash alerts require the daemon to emit the supported authenticated crash event; stock Wings currently does not emit it. PWA support does not add background push notifications.

### Validation

- 2,266 PHP tests and 30,511 assertions pass with 100% executable line coverage on PHP 8.5 and MariaDB 11.
- The frontend retains 1,574 passing tests with 100% statement, branch, function and line coverage. Forty standalone admin/PWA checks cover safe rendering, worker retirement, cache isolation and install controls.
- Browser checks cover mobile layout, daemon connectivity, offline recovery, PWA enable/disable and independent offline settings, custom names and collapsed release notes. Locked Composer and production pnpm audits report no advisories.

## v0.2-beta

### Security

- Recheck OAuth provider configuration after external requests. Reject callbacks when a provider is disabled or reconfigured while its response is in flight.
- Check the current account password and suspension status under a database lock before linking OAuth accounts or enrolling passkeys, preventing older authorized requests from storing new sign-in methods after an account security change.
- Share password-confirmation limits across account and administrator actions, including Blueprint, OAuth, webhooks and integration settings. Changing IPs or action endpoints does not reset the account limit. Successful confirmation clears previous failures.

### Validation

- 2,188 PHP tests and 29,544 assertions pass with 100% executable line coverage on PHP 8.5 and MariaDB 11, running as an unprivileged user.
- Added regression checks for concurrent account and provider changes, distributed password-confirmation attempts, cooldown expiry and independent account limits.

## v0.1-beta

### Security

- Encode account data, branding and restored form values for inline JavaScript contexts. Harden legacy Blueprint JavaScript injection and admin form HTML attributes against stored input being interpreted as code.
- Prevent concurrent recovery-code reuse and TOTP replay within the clock-skew window. Invalidate pending second-factor logins after credential changes, serialize 2FA setup and verification, and enforce account-based second-factor and password-reset request limits.
- Restrict console-generated Hytale login links to the official verification URL. Block redirects carrying daemon configuration, DNS or CAPTCHA request bodies, bound CAPTCHA verification and reject malformed responses. Validate release tags before shell commands and generated PHP use them.

### Added

- Discord and signed JSON webhooks for system actions, status changes and panel or daemon updates, with event subscriptions, encrypted credentials, queued delivery and retry history.
- Optional hourly release checks, detected installed version changes, and inline GitHub release descriptions matching the installed panel version in the administration overview. Canary builds use the `canary` release; versioned builds use their matching release tag. The footer shows the version without a notes dropdown.

### Removed

- Removed upstream Pterodactyl telemetry collection, its scheduled job, environment setting, and console command. Aquadactyl and Blueprint retain their separate opt-in controls.
