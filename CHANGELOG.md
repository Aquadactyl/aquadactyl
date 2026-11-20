<!-- markdownlint-disable MD024 -->

# Changelog

Aquadactyl release notes.

This project follows [Semantic Versioning](http://semver.org) guidelines.

## Unreleased (Aquadactyl)

- Stop and report failed Blueprint lifecycle scripts instead of hiding failed
  backend copies behind a successful cache clear. Preserve the configured web
  identity by default and support an explicit root-operator opt-in for reviewed
  legacy core-modifying scripts, including removal. Keep panel source root-owned.

## v1.1-beta.5

- Disable PHP session upload progress in the native PHP-FPM template, matching
  Docker. Existing native deployments must apply the setting to their actual
  FPM configuration and reload that service; a source update alone is insufficient.
- Add public contribution forms and private security-report links. Keep required
  CI and branch protections mandatory, with a separate review-only exemption
  for the current code owners.
- Fix legacy Blueprint preflight imports using an addon's identifier placeholder,
  Twin palette colours with slash opacity, Formik field wrappers, core router
  history hooks and button CSS-module exports. Add a React 19-safe CSSTransition
  adapter. MC Mods 2.1, MC Plugins 2.1 and Subdomains 0.5.2 now pass frontend checks
  without modifying their packages or running their lifecycle scripts.

## v1.1-beta.4

- Restore the Egg Library using eggs.download's canonical versioned JSON API.
  Refresh legacy catalog/preview caches and distinguish a catalog outage from
  an individual egg that is no longer available.

## v1.1-beta.3

- Use `/var/lib/aquadactyl/volumes` for new nodes created through the UI, API
  and CLI, and generate `manta configure` setup commands. Existing node paths
  remain unchanged. Mark generated daemon configs with `config_version: 1`.
- Protect the new default server-data directory from being added as a server
  mount, alongside the existing configuration and legacy path guards.
- Match installation documentation to Manta v1.1-beta.2 and Installer v1.1-beta.2,
  including the `manta` executable, service and native Aquadactyl storage paths.

## v1.1-beta.2

- Show `/etc/aquadactyl` in English, French and German node configuration
  instructions, and remove the old-directory dependency from generated setup
  commands. Quote the panel URL for the node's shell.
- Add the Aquadactyl configuration directory to the mount-source denylist while
  keeping the legacy entry. Use the canonical directory in the isolated demo's
  shared configuration volume and Manta command.

## v1.1-beta.1

- Keep the first-start Blueprint welcome dialog outside admin layout containers so
  header clipping and sidebar transforms cannot hide it behind its backdrop.
- Remove the unused `APP_THEME` default and use `AQUADACTYL_FILES_MAX_EDIT_SIZE`
  for editor/image-preview limits, retaining the legacy environment-key fallback.

## v1.1-beta

### Security

- Apply SFTP failure limits per account across server identifiers, nodes and
  username casing. Failed logins no longer lock other users out of the same server.
- Reject negative, malformed and overflowing pagination parameters before listing
  servers or backups. Preserve existing client page-size caps and bound daemon
  configuration pages to 1,000 servers.
- Execute only Laravel's front controller in Docker Nginx, deny hidden files,
  hide runtime version headers and stop recording HTTPS query strings in access logs.
- Require TLS 1.2/1.3 in the bundled HTTPS configuration and remove world-writable
  application cache, storage and panel log permissions from new Docker images.
- Bind the Vite development server to loopback and restore restricted CORS defaults,
  with explicit options for container/WSL development.

### Performance and correctness

- Preserve each server's variable overrides in daemon configuration responses,
  including servers sharing an egg. Batch primary allocations and inherited egg
  settings rather than querying them for every server.
- Load variable definitions and overrides in two queries per nonempty page.
- Reuse Docker frontend build layers after public branding or admin stylesheet edits.
- Avoid rerunning the integration suite separately in the PHP coverage matrix job;
  the complete coverage gate and database-free unit checks remain enabled.

### Also included since v1.0-beta

- An opt-in, isolated public demo with restricted user/admin accounts, real Manta
  example servers and automatic five-minute resets. Ordinary deployments keep demo
  mode disabled.
- Updated Git installation, database-repair and unfinished-installation recovery
  instructions using the versioned installer.

### Updating

- Back up the database, application secrets, uploads and original Blueprint addon
  packages. Update with the versioned installer or recreate the panel from the
  versioned Docker image. Rebuilding frontend assets alone does not apply PHP or
  Nginx fixes.
- Customized or persisted Nginx configurations must adopt the front-controller,
  hidden-file, logging and TLS changes explicitly. Standalone public PHP entrypoints
  are unsupported, matching the native Nginx template. Blueprint Laravel routes
  continue to work.

### Validation

- 2,343 PHP tests and 30,715 assertions pass with 100% executable line coverage on
  PHP 8.5 and MariaDB 11. The frontend retains 1,583 passing tests and 100%
  statement, branch, function and line coverage.
- Production Composer and pnpm audits, scoped PHP static analysis, type/lint checks,
  security/admin/game-query tests and Blueprint preflight pass.
- The rebuilt Docker image passes isolated HTTP/HTTPS routing, hidden-file,
  direct-PHP and TLS checks. Public-file edits retain the frontend build cache.

## v1.0-beta

### Installation and releases

- Install and update an exact release through Git using the versioned Aquadactyl
  Installer. Replace obsolete commands referring to scripts absent from the panel.
- Keep backups, application secrets, uploads and Blueprint state during updates;
  require original addon packages and stop on failed addon reapplication.
- Resolve Blueprint's panel directory from the script location inside containers
  too, supporting Git installations outside `/app`.
- Stamp the source tag with its runtime version before packaging. Release builds
  upload artifacts for maintainer verification and publication; prereleases remain beta.
- Refresh installation, HTTPS/proxy, service and recovery guidance alongside Manta.

### Performance and security

- Batch daemon-product lookups when returning server lists, avoiding one database
  query for every server row while preserving Wings/Manta detection.
- Update the game-query XML parser to a patched release for GHSA-474x-hrwr-fgx4.

### Included in this beta

- Bundled Blueprint and legacy addon adapters, guided setup, configurable PWA,
  appearance controls, passkeys/OAuth/2FA, per-user languages and notifications.
- Server folders, schedules, file trash/previews, browser uploads, optional status
  page, Discord roles, managed server subdomains, audit logs and action webhooks.
- Manta-aware server file search, with existing Wings compatibility retained.

### Validation

- 2,268 PHP tests pass with 100% executable line coverage; 1,582 frontend tests
  pass with 100% statement, branch, function and line coverage.
- Installer safety tests cover exact Git tags, unsafe paths, dotenv values and
  release-binary checksum/version verification. Test your own addons and workload
  in staging before upgrading a public panel.

## v0.4-beta

### Added

- Manual GitHub release workflow dispatch (`workflow_dispatch`) with inputs for version tags and prerelease status, automatically normalising release tags and creating matching release branch targets.
- Read-only Ace editor integration for the admin Laravel log viewer (`admin/settings/logs`) with line numbers, interactive search dialog, line wrapping toggle, and automatic scroll-to-end.
- Dark theme support for the Ace editor (`tomorrow_night` and `monokai`), setting dark mode by default for egg installation scripts and the Laravel log viewer to match the panel's dark palette.

### Changed

- Modernized admin panel JavaScript across `public/themes/pterodactyl/js/admin/`, refactoring legacy scripts to modern ES2022+ syntax, arrow functions, and native browser APIs.
- Replaced third-party animation and scrolling plugins (`animate.css`, `font-awesome-animation`, and `jquery.slimscroll`) with modern CSS keyframes and native scroll container styling.
- Enhanced user management forms with standard autocomplete attributes and updated engine versions for Node.js and pnpm.

### Removed

- Pruned unused syntax modes (`ini`, `json`, `properties`, `yaml`), extensions (`ext-whitespace`), and legacy light theme (`theme-chrome`) from the Ace editor vendor bundle, alongside 41 previously pruned Ace files.
- Removed unused and obsolete vendor assets including unminified `jquery.js`, `bootstrap-theme.min.css`, orphaned pre-Vite SVGs in `public/assets/svgs/`, and an archived favicon generator zip.
- Removed legacy `jquery.slimscroll.min.js` and `bootstrap-notify.min.js` vendor libraries from the administration layout in favour of native browser APIs and built-in toast notifications.
- Removed obsolete `config/compile.php` (Laravel 5 class compiler) and `config/trustedproxy.php` (abandoned Fideloper proxy package) configurations.
- Removed dead Pterodactyl v0.7 schedule task chain Blade template (`resources/views/partials/schedules/task-template.blade.php`) and unused `window.getPageName` function.
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
