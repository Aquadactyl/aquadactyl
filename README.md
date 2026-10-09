# Aquadactyl

[Website](https://aquadactyl.uk) · [Documentation](https://aquadactyl.uk/docs) ·
[Source](https://github.com/Aquadactyl/aquadactyl)

Aquadactyl is a game server management panel built on Pterodactyl, with Blueprint
bundled and tools for installing and updating the panel on Linux with Nginx and
PHP-FPM.

Manage your servers through Aquadactyl's interface, extend the panel
with Blueprint, and deploy updates using pinned dependencies and automatic backups.
Game servers run on separate Wings nodes using Docker containers.

Aquadactyl is an independent fork. It is not an official Pterodactyl or Blueprint release.

## What Aquadactyl includes

- **Charcoal default theme:** Soft grey surfaces, readable text and muted aqua
  accents across the dashboard, login, console and admin area. See the
  [theme guide](docs/THEME.md) for palette tokens and customisation.
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
- **Addon libraries:** Axios, Lucide icons, React Select and Lodash ES,
  alongside the panel's Formik, Yup, UI and chart libraries.
  See the [addon development guide](docs/ADDONS.md).
- **Simple server schedules:** Choose daily, weekly, monthly, or regular interval
  timings, then add restart, backup, or command steps with readable delays.
  Advanced cron remains available. See the [schedule guide](docs/SCHEDULES.md).
- **Dependency maintenance:** Committed Composer and pnpm lockfiles, weekly
  Dependabot checks and CI audits for production dependencies.

See [validation results](docs/VALIDATION.md) for the checks performed and remaining
build dependency advisories.

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
Node.js 22.13 or later, pnpm 12.10.1, Nginx, MariaDB or MySQL, Redis and systemd. Required PHP
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
| [Validation](docs/VALIDATION.md)                                                            | Test results and dependency audit limitations                                     |
| [Building](BUILDING.md)                                                                     | Frontend development and production builds                                        |
| [Security policy](SECURITY.md)                                                              | Reporting vulnerabilities in Aquadactyl and its upstream projects                 |
| [Branding and licensing](docs/BRANDING.md)                                                  | Rebranding permissions, attribution and compatibility identifiers                 |
| [Upstream Pterodactyl documentation](https://pterodactyl.io/panel/1.0/getting_started.html) | Panel concepts and administration                                                 |

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
