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
React. This independent Pterodactyl fork includes Blueprint, a customisable dark
theme and managed updates. Game servers run in Docker containers on Wings nodes,
using server definitions from the Pterodactyl egg ecosystem.

[Installation](https://aquadactyl.uk/docs) ·
[Updating](https://aquadactyl.uk/docs/updating) ·
[Features](https://aquadactyl.uk/docs/panel/features) ·
[Contributing](CONTRIBUTING.md)

## Features

- **Appearance:** Charcoal theme, Inter font, custom logos, primary colours,
  backgrounds and login layouts, with desktop and mobile previews.
- **Account security:** Passkeys, two-factor authentication and connected Discord,
  GitHub, Google or OpenID Connect accounts. Admins control available methods.
- **Languages:** English, French and German in the client and admin areas, with
  per-user selection, browser language detection and additional language packs.
- **Blueprint:** Bundled framework, one-command addon installation/removal and
  adapters for supported legacy Pterodactyl addons and themes.
- **Server tools:** Guided schedules, an admin Egg Library, player counts, image
  previews, larger file uploads, optional file trash and redacted console sharing.
- **Administration:** Branding, SMTP/Mailgun/Postmark/SES delivery and optional
  features configured in the admin area. Unconfigured sign-in methods stay hidden.
- **Deployment:** Locked Composer/pnpm dependencies, managed backups and updates,
  Redis, PHP OPcache, lazy frontend routes and cached assets.

See the [feature guide](https://aquadactyl.uk/docs/panel/features) for settings and
defaults, and [performance notes](docs/PERFORMANCE.md) for measured results.

## Try it locally

With Docker and Compose installed, run from this checkout:

```bash
docker compose up -d --build --wait --wait-timeout 600
```

Open [localhost:8081](http://localhost:8081) and sign in with
`admin@aquadactyl.test` / `AquadactylLocal123!`. This local testing stack initializes
MariaDB, Redis, the panel, Blueprint and Wings automatically. See
[BUILDING.md](BUILDING.md#instant-local-setup-with-docker) for rebuilds and resets.

## Linux installation

Use PHP 8.5 with PHP-FPM (8.4 is also supported), Composer 2, Node.js 24.11 or later,
pnpm 12.10.1, Nginx, MariaDB/MySQL, Redis and systemd. Prepare the required packages
and services using the [installation guide](https://aquadactyl.uk/docs), then place
a release or source checkout in `/var/www/aquadactyl`:

```bash
cd /var/www/aquadactyl
sudo cp .env.example .env
sudo chmod 640 .env
sudo nano .env
sudo bash scripts/panel-install.sh
```

Configure the HTTPS `APP_URL`, database, Redis and mail in `.env` before running
the installer. For a **new, empty panel**, seed the default nests and create an
administrator:

```bash
sudo -u www-data php artisan db:seed --class=DatabaseSeeder --force
sudo -u www-data php artisan p:user:make
```

Complete the guide's Nginx/TLS, queue and scheduler setup, and configure
[Wings](https://pterodactyl.io/wings/1.0/installing.html) to host game servers.
Existing installations can retain `/var/www/pterodactyl`; match service paths to
your installation. See the [deployment reference](docs/DEPLOYMENT.md) for details.

## Updating Aquadactyl

Use a reviewed release tag to update the panel and bundled Blueprint together:

```bash
cd /var/www/aquadactyl
sudo bash scripts/panel-update.sh vRELEASE_TAG Aquadactyl/aquadactyl
```

The updater verifies the archive, backs up the database and panel files, then
installs locked dependencies, applies migrations and rebuilds assets and caches.
Preserve your application key, Hashids salt and original addon packages. Read the
[update and recovery guide](https://aquadactyl.uk/docs/updating) before deploying.

## Blueprint extensions

Place `myextension.blueprint` in the panel root, then run as root inside the panel
container, or with `sudo` on a native Linux installation:

```bash
blueprint -i myextension
blueprint -r myextension
```

These commands handle builds, migrations, permissions and caches. Use
`blueprint -check myextension` to check supported frontend compatibility before
installation. Extensions execute panel code; choose trusted publishers. The
stock `blueprint -upgrade` command is disabled; use the managed panel updater.

## Documentation

Operator guides live at [aquadactyl.uk/docs](https://aquadactyl.uk/docs), maintained
in the [website repository](https://github.com/Aquadactyl/website). Local references:

| Guide                                                                       | Covers                                                         |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Building](BUILDING.md)                                                     | Local Docker setup, frontend builds and site settings          |
| [Deployment](docs/DEPLOYMENT.md)                                            | Linux installation, proxies, backups, updates and logging      |
| [Blueprint](docs/BLUEPRINT.md)                                              | Framework integration and addon lifecycle                      |
| [Compatibility](docs/BLUEPRINT-COMPATIBILITY.md)                            | Supported legacy addon interfaces and limits                   |
| [Addon development](docs/ADDONS.md)                                         | Shared libraries and dependency management                     |
| [Theme](docs/THEME.md) / [Appearance and mail](docs/APPEARANCE-AND-MAIL.md) | Theme tokens, branding and mail configuration                  |
| [Account security](docs/ACCOUNT-SECURITY.md)                                | Passkeys, OAuth providers and two-factor verification          |
| [Translations](docs/TRANSLATIONS.md)                                        | Language selection and contributing packs                      |
| [Schedules](docs/SCHEDULES.md) / [Egg Library](docs/EGG-LIBRARY.md)         | Server automation and importing definitions                    |
| [Testing](docs/TESTING.md) / [Performance](docs/PERFORMANCE.md)             | Coverage gates, dependency audits and performance measurements |
| [Security](SECURITY.md) / [Branding](docs/BRANDING.md)                      | Vulnerability reporting, attribution and licensing             |

## Privacy and diagnostics

Aquadactyl and Blueprint telemetry are disabled by default on new installations;
upstream Pterodactyl telemetry has been removed. Admins can explicitly enable
aggregate Aquadactyl telemetry. Debug logging and console sharing are opt-in.
See [telemetry and troubleshooting](docs/DEPLOYMENT.md#telemetry-and-troubleshooting)
for the report contents, settings and redacted log preview/upload commands.

## Credits and license

Aquadactyl builds on [Pterodactyl Panel](https://github.com/pterodactyl/panel) and
integrates [Blueprint](https://github.com/BlueprintFramework/framework). It is an
independent project; upstream authors and contributors retain credit for their work.

Panel code uses the [MIT License](LICENSE.md); Blueprint's
[MIT license](licenses/BLUEPRINT-LICENSE.md) is included separately. Keep upstream
copyright and license notices. Bundled artwork retains its own license terms,
and MIT does not grant trademark rights; see [branding and licensing](docs/BRANDING.md).
