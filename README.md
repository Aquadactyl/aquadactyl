<p align="center">
  <a href="https://aquadactyl.uk">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/aquadactyl-wordmark.png">
      <img alt="Aquadactyl" src=".github/assets/aquadactyl-wordmark.png" height="72">
    </picture>
  </a>
</p>

[![Tests](https://img.shields.io/github/actions/workflow/status/Aquadactyl/aquadactyl/ci.yaml?branch=main&label=Tests&style=for-the-badge)](https://github.com/Aquadactyl/aquadactyl/actions/workflows/ci.yaml?query=branch%3Amain)
![GitHub release](https://img.shields.io/github/v/release/Aquadactyl/aquadactyl?style=for-the-badge)
![GitHub contributors](https://img.shields.io/github/contributors/Aquadactyl/aquadactyl?style=for-the-badge)

# Aquadactyl Panel

Aquadactyl is a free, open-source game server management panel built with PHP and
React. It is an independent Pterodactyl fork with Blueprint bundled into the
panel, managed releases, and a focused deployment experience for hosting
providers and communities.

Manage your servers through Aquadactyl's interface, customise your branding,
sign in with passkeys or connected accounts, and choose your own panel language.
Extend the panel with Blueprint and deploy updates using pinned dependencies
and automatic backups.
Game servers run on separate Wings nodes using Docker containers.

Aquadactyl is an independent project and is not an official Pterodactyl or
Blueprint release.

## Supported games

Aquadactyl runs game servers in isolated Docker containers through Wings. It
supports the games available through the Pterodactyl ecosystem, including:

- Minecraft and its Paper, Sponge, BungeeCord and Waterfall variants
- Rust, Terraria, TeamSpeak and Mumble
- Team Fortress 2, Counter-Strike 2, Garry's Mod and ARK: Survival Evolved
- Factorio, Squad, Xonotic, Starmade and Node.js/Python applications

The community [egg library](https://eggs.pterodactyl.io/) provides additional
server definitions.

## What Aquadactyl includes

- **Charcoal default theme:** Soft grey surfaces, readable text and muted aqua
  accents across the dashboard, login, console and admin area. See the
  [theme guide](docs/THEME.md) for palette tokens and customisation.
- **Appearance customiser:** Set the site name, logo and primary colour; upload
  login and client backgrounds; adjust blur and overlays; and choose a centred
  login card or a full-height left or right pane. Desktop and mobile previews
  update as you edit. Buttons, navigation, controls and CPU, memory and outbound
  network graphs follow the primary colour.
- **Passkeys and OAuth:** Existing users and administrators can register passkeys
  or link Discord, GitHub, Google and OpenID Connect. Admins configure available
  methods under Settings → OAuth. Existing permissions and two-factor
  verification still apply. See the [account security guide](docs/ACCOUNT-SECURITY.md).
- **Languages per account:** English, French and German are bundled for the
  client and admin areas. Users choose a language or follow their browser's
  preferences, with support for additional JSON language packs. See the
  [translation guide](docs/TRANSLATIONS.md).
- **Blueprint built in:** Framework beta-2026-08, including its CLI, admin pages,
  extension routes and frontend hooks. The installer initializes the bundled framework.
- **Managed installation and updates:** Linux scripts build assets, run migrations
  and refresh application caches. Updates verify release checksums, back up the
  database and panel files, and preserve configuration and extension data.
- **Production performance defaults:** Redis cache, sessions and queues; PHP
  OPcache; cached Laravel configuration, routes and views; and Nginx compression
  and caching for hashed assets.
- **Deployment security defaults:** Restricted filesystem permissions, HTTPS
  session cookies, Nginx rules that protect hidden files and limit PHP execution
  to the front controller, and validation of update archives before extraction.
- **Addon libraries:** Axios, Lucide icons, Base UI, es-toolkit, date-fns and
  Motion, alongside React Hook Form, Zod, TanStack Query, Zustand and uPlot.
  See the [addon development guide](docs/ADDONS.md).
- **Simple server schedules:** Choose daily, weekly, monthly, or regular interval
  timings, then add restart, backup, or command steps with readable delays.
  Advanced cron remains available. See the [schedule guide](docs/SCHEDULES.md).
- **Egg Library:** Browse eggs.download from the admin area, preview egg settings,
  and import into an existing or new nest. See the [Egg Library guide](docs/EGG-LIBRARY.md).
- **Server overview and console tools:** Player counts, optional node country
  flags and permission-aware server shortcuts. Copy the full UUID from the
  Console page and use the Lucide arrow to jump to the latest output.
- **Recoverable file deletion:** Optional per-server trash for files and folders,
  with restore, permanent deletion and admin-configured retention from 1–365 days.
  Trash is disabled by default and keeps files within the server's disk limit.
- **Console log sharing:** An optional clipboard button shares a redacted console
  log tail through debug.euphoriadevelopment.uk and returns a copyable link to
  the requesting user. Pastes expire after 24 hours; sharing is disabled by default.
- **Mail services and account controls:** Configure SMTP, Mailgun, Postmark or
  Amazon SES in admin settings. Admins can remove uploaded profile pictures and
  control which optional features users see. Disabled or unconfigured sign-in
  methods are hidden from account settings.
- **Dependency maintenance:** Committed Composer and pnpm lockfiles, weekly
  Dependabot checks and CI audits for production dependencies.

See [validation results](docs/VALIDATION.md) for the checks performed and remaining
build dependency advisories.

## Configure the new features

Open **Admin → Settings → Appearance** for site branding, colours, backgrounds
and login layouts; **Settings → OAuth** for passkeys and connected accounts; and
**Settings → Mail** for email delivery. Most UI settings require
`APP_ENVIRONMENT_ONLY=false`. OAuth and passkey settings remain database-backed
in environment-only mode.

The optional server tools are configured under **Admin → Settings → General**:

| Feature             | Default | Behaviour when enabled                                                                                |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| Server file trash   | Off     | Offer move to trash or permanent deletion; open Trash from each server's Files page to restore items. |
| Trash retention     | 7 days  | Admins choose 1–365 days for new deletions; existing expiry dates are preserved.                      |
| Console log sharing | Off     | Show a clipboard button beside the console input and return a link lasting 24 hours.                  |

Trash contents remain on Wings and count towards the server's disk usage.
Scheduled cleanup runs every 15 minutes, including when trash is disabled;
disabling it also blocks restoration. Keep both the panel database and Wings
data in backups. Console log redaction is best effort; review a paste before
sharing its link. See [site settings and server tools](BUILDING.md#site-settings)
for permissions, retention and deployment details, or the
[website feature guide](https://aquadactyl.uk/docs/panel/features) for an overview.

## Try it locally

With Docker and Compose installed, start the current checkout with:

```bash
docker compose up -d --build --wait --wait-timeout 600
```

Open [localhost:8081](http://localhost:8081) and sign in as
`admin@aquadactyl.test` with password `AquadactylLocal123!`. The local-only stack
initializes MariaDB, Redis, the panel, Blueprint and a connected Wings node
automatically. See
[local setup and reset instructions](BUILDING.md#instant-local-setup-with-docker).

## Linux installation

Prepare a Linux host with PHP 8.5 and PHP-FPM (PHP 8.4 is also supported), Composer 2,
Node.js 24 or later, pnpm 12.10.1, Nginx, MariaDB or MySQL, Redis and systemd. Required PHP
extensions and command-line utilities are listed in the
[installation guide](https://aquadactyl.uk/docs#requirements).

Place an Aquadactyl release or source checkout in `/var/www/aquadactyl`.
The scripts also work from an existing installation directory, including
`/var/www/pterodactyl`; match your Nginx, queue and scheduler paths to that directory.

```bash
cd /var/www/aquadactyl
sudo cp .env.example .env
sudo chmod 640 .env
sudo nano .env
sudo bash scripts/panel-install.sh
```

Before running the installer, configure your HTTPS `APP_URL`, database, Redis
and mail settings in `.env`. The installer generates missing application keys
and initializes Blueprint. Preserve your application key and Hashids salt
across updates.

For a **new, empty panel**, add the default nests and create an administrator:

```bash
sudo -u www-data php artisan db:seed --class=DatabaseSeeder --force
sudo -u www-data php artisan p:user:make
```

Complete the [installation guide](https://aquadactyl.uk/docs#web-server) to configure TLS, the supplied
Nginx and PHP settings, the queue service and the scheduler. Configure
[Wings](https://pterodactyl.io/wings/1.0/installing.html) separately to host game servers.

## Updating Aquadactyl

Update the panel and bundled Blueprint together using a reviewed release of this
fork. Replace `vRELEASE_TAG` with a published release tag:

```bash
cd /var/www/aquadactyl
sudo bash scripts/panel-update.sh vRELEASE_TAG Aquadactyl/aquadactyl
```

If you publish Aquadactyl under a different GitHub repository, replace
`Aquadactyl/aquadactyl` with that repository's `owner/name`.

The updater verifies the archive, enables maintenance mode, pauses the queue and
creates database and filesystem backups in `/var/backups/aquadactyl`. It then
installs locked dependencies, applies migrations, restores extension hooks and
rebuilds assets and caches before bringing the panel online.

Keep each installed extension's original `identifier.blueprint` package in the
panel root so its hooks can be reapplied during updates. Read the
[update and recovery instructions](https://aquadactyl.uk/docs/updating) before deploying.

## Blueprint extensions

Blueprint is included in Aquadactyl and initialized during installation:

```bash
cd /var/www/aquadactyl
sudo blueprint -version
sudo blueprint -i myextension
sudo blueprint -r myextension
```

Place `myextension.blueprint` in the panel root before installing it. Inside the
Docker panel container, run `blueprint -i myextension` or `blueprint -r myextension`.
The commands handle builds, migrations, permissions, caches and PHP reloads.
Extensions
execute code as part of the panel, so use trusted publishers and check compatibility
before updating production.

The stock `blueprint -upgrade` command is disabled in Aquadactyl. Use the managed
panel updater to keep the framework, dependencies and panel changes compatible.
See the [Blueprint guide](https://aquadactyl.uk/docs/blueprint) for extension
maintenance and the [integration reference](docs/BLUEPRINT.md) for framework provenance.

## Documentation

Operator guides are hosted at [aquadactyl.uk/docs](https://aquadactyl.uk/docs).
Their source lives in the [website repository](https://github.com/Aquadactyl/website).
The local guides retain deployment details, developer references and validation records.

| Guide                                                                                       | Covers                                                                            |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Installation](https://aquadactyl.uk/docs)                                                  | Requirements, source checkout, environment, Nginx/TLS, queue, scheduler and Wings |
| [Updates](https://aquadactyl.uk/docs/updating)                                              | Reviewed releases, managed updates, backups and recovery                          |
| [Blueprint](https://aquadactyl.uk/docs/blueprint)                                           | Bundled framework, extension installation and maintenance                         |
| [Deployment reference](docs/DEPLOYMENT.md)                                                  | Deployment scripts, permissions, compatibility settings and recovery details      |
| [Blueprint integration reference](docs/BLUEPRINT.md)                                        | Framework provenance and implementation details                                   |
| [Addon development](docs/ADDONS.md)                                                         | Shared libraries, imports and dependency management for extensions and themes     |
| [Default theme](docs/THEME.md)                                                              | Charcoal palette, shared colour tokens and theme customisation                    |
| [Panel features](https://aquadactyl.uk/docs/panel/features)                                 | Appearance, account security, languages, file trash, console sharing and mail     |
| [Account security](docs/ACCOUNT-SECURITY.md)                                                | Passkeys, Discord/GitHub/Google/OIDC setup and two-factor verification            |
| [Translations](docs/TRANSLATIONS.md)                                                        | Per-user language selection, admin translations and additional language packs     |
| [Validation](docs/VALIDATION.md)                                                            | Test results and dependency audit limitations                                     |
| [Building](BUILDING.md)                                                                     | Frontend development and production builds                                        |
| [Security policy](SECURITY.md)                                                              | Reporting vulnerabilities in Aquadactyl and its upstream projects                 |
| [Branding and licensing](docs/BRANDING.md)                                                  | Rebranding permissions, attribution and compatibility identifiers                 |
| [Upstream Pterodactyl documentation](https://pterodactyl.io/panel/1.0/getting_started.html) | Panel concepts and administration                                                 |

## Optional telemetry

Aquadactyl and Blueprint telemetry are **disabled by default** on new
installations. Upstream Pterodactyl telemetry has been removed. An administrator
can enable Aquadactyl telemetry
under **Admin → Settings → Advanced Settings → Aquadactyl Telemetry**. Public
panel installations do not need to create or configure a telemetry token:

Enable UI-based configuration with `APP_ENVIRONMENT_ONLY=false` to manage the
opt-in in Admin settings. With UI settings enabled, the saved toggle overrides
the environment's initial default. For environment-only configuration, use
`AQUADACTYL_TELEMETRY_ENABLED=true` to opt in explicitly.

```dotenv
AQUADACTYL_TELEMETRY_ENDPOINT=https://api.euphoriadevelopment.uk/telemetry/panel
```

When enabled, the panel sends one daily aggregate report containing an anonymous
installation UUID, panel/PHP versions, driver names, Docker availability, and
counts of users, servers, and nodes. It does not send names, email addresses,
IP addresses, domains, server names, credentials, tokens, or request contents.
These statements describe the report payload; the receiving service can still
observe the connection's source IP. The setting can be disabled at any time; no
telemetry request is made while it is disabled or while the endpoint is unset.

The collectors also check consent when they run. Existing explicit opt-ins for
Aquadactyl and Blueprint are preserved during updates. Blueprint telemetry is
controlled by its `telemetry_enabled` flag.

## Panel languages

Users can select a language for their own account under **Account → Language**,
or choose automatic selection based on their browser language preferences.
English, French, and German are bundled for both the client and admin areas;
additional packs are discovered automatically. Automatic selection uses browser
preferences, without an IP location lookup. Contributions live in
[panel-translations](https://github.com/Aquadactyl/panel-translations). See
[language-pack setup and translation coverage](docs/TRANSLATIONS.md).

## Sharing debug logs

Normal logging defaults to `LOG_LEVEL=warning`, daily files and seven days of
retention. To collect debug-level messages temporarily, set `LOG_LEVEL=debug`,
run `php artisan config:clear`, and restart queue workers with
`php artisan queue:restart`. Keep `APP_DEBUG=false` on public deployments; changing
log verbosity does not require exposing debug pages. Restore `LOG_LEVEL=warning`
and repeat those commands after troubleshooting.

When support asks for panel logs, first preview the redacted log locally:

```bash
php artisan p:debug --dry-run
```

To upload it explicitly, run this from the panel directory:

```bash
php artisan p:debug
```

The command reads the configured single log or latest dated daily log and uploads
only its bounded tail (256 KiB by default) to
[debug.euphoriadevelopment.uk](https://debug.euphoriadevelopment.uk), removes
common passwords, tokens, API keys, cookies and authorization credentials, and prints a
temporary share URL. Pastes expire after 24 hours by default. You can upload a
different log file with `--file=/path/to/log` or choose an expiration with
`--expires=3600`.

Supported expiration values are `3600`, `86400`, `172800`, `604800`, and
`2592000` seconds. `--expires=0` creates a paste without automatic expiration.
The command uses the service's public `/paste` API and the duration values used by
its [browser client](https://debug.euphoriadevelopment.uk/js/main.js); other
expiration values are rejected before any content is sent.

Preview the contents before uploading and sharing the URL. Redaction is a safety measure, not a
guarantee that a log contains no sensitive information.

## Credits and license

Aquadactyl builds on [Pterodactyl Panel](https://github.com/pterodactyl/panel)
and integrates [Blueprint](https://github.com/BlueprintFramework/framework).
Credit belongs to their authors and contributors for the underlying panel,
server management platform and extension framework.

Panel code is distributed under the [MIT License](LICENSE.md). Blueprint's
[MIT license](deploy/BLUEPRINT-LICENSE.md) is included separately; bundled artwork
retains its upstream license files. Existing upstream copyright notices remain
in their respective files.

The Panel's MIT terms permit modified and commercially distributed forks while
requiring the original copyright and license notices to accompany copies. They
contain no explicit trademark license. Blueprint branding artwork has separate,
restrictive terms; see the [licensing review](docs/BRANDING.md) before redistribution.
