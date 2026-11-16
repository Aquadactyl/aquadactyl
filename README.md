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
theme and managed updates. Game servers run in Docker containers on Manta or Wings nodes,
using server definitions from the Pterodactyl egg ecosystem.

[Installation](https://aquadactyl.uk/docs) ·
[Updating](https://aquadactyl.uk/docs/updating) ·
[Features](https://aquadactyl.uk/docs/panel/features) ·
[Contributing](CONTRIBUTING.md)

## Features

- **First-run setup and PWA:** Guided branding, optional location/node creation with
  connectivity checks and additional administrator accounts. Install the panel as
  an app with a safe offline connection page; admins configure installation,
  offline support and app names under Settings > PWA.
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
- **Server organisation:** Personal folders with account sync and pagination-aware
  filtering, with an admin toggle that preserves saved folders when disabled.
  Admins can search Other servers by owner username, email or name.
- **Administration:** Branding, SMTP/Mailgun/Postmark/SES delivery and optional
  features configured in the admin area. Unconfigured sign-in methods stay hidden.
  Create nodes and locations without leaving the server setup flow, temporarily
  suspend user accounts and their servers, and review panel-wide audit logs.
- **Status and Discord:** An optional public or signed-in status page with published
  services and incident notices, plus automatic Discord roles based on owned
  servers, eggs and nodes. Configure both under **Admin > Settings**.
- **Notifications and releases:** Toast notifications, an opt-in account inbox and
  personal Discord alerts for power actions, schedules, backups and installations.
  Administrators control availability and personal webhooks. Discord or signed JSON webhooks for system actions,
  status changes, available updates and detected version changes, with delivery history.
  Optional background release checks and collapsible GitHub release notes matching the installed panel version.
- **Server domains and operations:** Cloudflare-managed server subdomains, admin
  Blueprint installation/removal, themed panel maintenance with an admin preview,
  a lightweight log viewer and a daemon overview. See the [setup guide](docs/ADMIN-OPERATIONS.md).
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

The v1.0-beta release is a prerelease: test your workload and extensions before
upgrading a live installation. The Git-based installer supports Ubuntu 24.04/26.04
LTS and Debian 12/13, with PHP 8.5 (8.4 supported), Node.js 24.22.1 or later,
Composer 2 and the panel's pinned pnpm.

```bash
git clone --depth 1 --branch v1.0-beta.1 https://github.com/Aquadactyl/Installer.git /opt/aquadactyl-installer
cd /opt/aquadactyl-installer
sudo bash deploy.sh install v1.0-beta
```

The installer fetches the exact panel tag, installs locked dependencies, initializes
Blueprint and configures the queue and scheduler. Configure your HTTPS domain,
database and email, obtain a trusted TLS certificate, then sign in as an
administrator to complete **Panel setup**. See the [installation guide](https://aquadactyl.uk/docs/panel/installing-the-panel)
and [deployment reference](docs/DEPLOYMENT.md), including reverse-proxy configuration.

Install [Manta](https://github.com/Aquadactyl/manta/blob/main/docs/INSTALLING.md)
on each game-server node. Existing Wings nodes remain supported. The local Docker
example above uses test credentials and is intended for development.

## Updating Aquadactyl

From your reviewed installer checkout, select an explicit published release:

```bash
cd /opt/aquadactyl-installer
sudo bash deploy.sh update v1.0-beta
```

The updater fetches the tagged source through Git, pauses the panel, backs up its
database and files, installs locked dependencies, runs migrations and rebuilds
assets. Keep `.env`, application keys, Hashids salt and original `identifier.blueprint`
packages. It preserves uploads and extension state, and stops if an addon package
is missing. Failures leave maintenance active for recovery. Read the
[update guide](https://aquadactyl.uk/docs/panel/updating-the-panel) before deploying.
Do not run `git pull` over files modified by extensions.

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
