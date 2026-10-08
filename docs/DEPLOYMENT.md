# Linux installation and updates

Read the [installation guide](https://aquadactyl.uk/docs) and
[update guide](https://aquadactyl.uk/docs/updating) on the project website.
This reference covers the scripts and configuration in this checkout. The hosted
guides are maintained in the [website repository](https://github.com/Aquadactyl/website).

This repository includes Blueprint beta-2026-08 in its source and release archives.
The install command initializes its database settings, CLI shortcut and public asset
links. No framework download is needed on the server. Use releases of this fork for
updates so that the panel and Blueprint stay compatible.

## Requirements

Use PHP 8.5 with FPM (PHP 8.4 is also supported), Composer 2, Node.js 22.13 or later,
pnpm 12.10.1, Nginx, MariaDB/MySQL, Redis, and systemd. The panel's Composer extensions include bcmath,
curl, gd, mbstring, PDO MySQL, posix, XML and zip. Deployment also uses bash, curl,
git, zip, unzip, rsync, flock, runuser and mariadb-dump (or mysqldump). On Debian or
Ubuntu, the last tools are supplied by packages including `rsync`, `util-linux`,
`zip`, `unzip`, `git`, `curl`, and `mariadb-client`.

Keep MySQL and Redis on localhost or a private network. This workflow manages an
existing Linux host; it does not provision operating-system packages or TLS certificates.

Install the package manager version pinned in `package.json`:

```bash
sudo npm install --global pnpm@12.10.1
```

When migrating an existing host, install the PHP 8.5 CLI, FPM and required
extensions, then switch the CLI, queue service and Nginx socket to the same
version before running deployment. PHP 8.2 and 8.3 are no longer supported by this
fork. Use `PHP_FPM_SERVICE=php8.4-fpm` and the matching Nginx socket for PHP 8.4.

## First installation

Extract this fork's release to `/var/www/aquadactyl`. A source checkout also works;
the installer builds the frontend using the committed lockfile.

Existing installations can keep their current directory, database credentials
and `pteroq.service`. The scripts find the panel root from their own location;
adjust the Nginx, systemd and cron examples to your actual directory. Do not create
a second queue worker or scheduler when updating an existing installation.
See [branding compatibility](BRANDING.md#existing-installations) for display names
and Redis/session prefixes.

```bash
cd /var/www/aquadactyl
sudo cp .env.example .env
sudo chmod 640 .env
sudo nano .env
sudo bash scripts/panel-install.sh
```

Configure `APP_URL` with your HTTPS domain, database credentials, Redis and mail.
New installs default to `APP_NAME=Aquadactyl`, `DB_USERNAME=aquadactyl` and
`MAIL_FROM_NAME="Aquadactyl Panel"`; create that database user or supply your own credentials.
The installer creates an application key and Hashids salt when they are missing.
Preserve both across every update and backup; the application key encrypts stored credentials. For local HTTP
development, explicitly set `SESSION_SECURE_COOKIE=false`.

For a **new, empty panel**, seed the default nests and create your administrator:

```bash
sudo -u www-data php artisan db:seed --class=DatabaseSeeder --force
sudo -u www-data php artisan p:user:make
```

The general database seeder can update default eggs. Updates only run migrations
and Blueprint's seeder, which preserves existing Blueprint settings.

Edit `deploy/nginx/panel.conf` for your domain, certificate paths, panel path and
FPM socket, then install it as your Nginx site. Serve only `public/`. Install
`deploy/php/99-panel.ini` in your PHP FPM `conf.d` directory and reload FPM.
Validate Nginx with `sudo nginx -t` before reloading it.

Install the queue service and scheduler, adjusting paths and PHP version as needed:

```bash
sudo cp deploy/systemd/pteroq.service /etc/systemd/system/pteroq.service
sudo systemctl daemon-reload
sudo systemctl enable --now pteroq.service
```

Add this line to `/etc/cron.d/aquadactyl`:

```cron
* * * * * www-data cd /var/www/aquadactyl && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

The defaults use Redis for cache, sessions and queues. FPM uses OPcache; the
deployment commands cache configuration, routes and views and reload FPM. The
Nginx template compresses text assets, caches hashed assets and executes only
`index.php`. It also denies hidden files and suppresses PHP version headers.

Source code is owned by root and readable by the web group. Only `storage/` and
`bootstrap/cache/` are writable by the web user after deployment. Never use `777`.
The scripts default to `www-data` and `php8.5-fpm`; customize when necessary:

```bash
sudo WEB_USER=nginx WEB_GROUP=nginx PHP_FPM_SERVICE=php-fpm bash scripts/panel-install.sh
```

## Updates

Publish a tagged release of this fork first. The release workflow attaches
`panel.tar.gz` and `SHA256SUMS`. Then choose an explicit tag:

```bash
cd /var/www/aquadactyl
sudo bash scripts/panel-update.sh vRELEASE_TAG Aquadactyl/aquadactyl
```

Replace `vRELEASE_TAG` with a reviewed, published release tag. If your fork has a
different owner, provide its `owner/repository` argument. For an already downloaded
archive, use the SHA256 from your reviewed release:

```bash
sudo bash scripts/panel-update.sh --archive /tmp/panel.tar.gz YOUR_64_CHARACTER_SHA256
```

The updater verifies the archive before entering maintenance, rejects escaping
paths and archive links, pauses the queue, and creates private SQL and filesystem
backups outside the web root. It preserves `.env`, uploads and extension data,
installs locked dependencies, runs migrations, rebuilds assets and caches, reloads
FPM, then starts the queue and brings the panel online. Scheduler tasks see
maintenance mode and do not run unless explicitly configured to do so.

Keep each installed extension's original `identifier.blueprint` package in the
panel root. Updates reapply these packages to rebuild their hooks in the new
source. A missing package stops the update before maintenance or file changes.
Extensions that patch core files through custom scripts need compatibility checks
in staging before deployment. Extension scripts run again during reapplication.

Backups default to `/var/backups/aquadactyl`. Override with `BACKUP_DIR` if needed.
To continue using an older backup location, set `BACKUP_DIR=/var/backups/pterodactyl`.
Back them up off-host and retain them according to your storage policy. SQL dumps
assume the panel's normal InnoDB tables and a single application instance. Coordinate
maintenance across all instances if you run multiple panels against one database.

An update failure leaves maintenance enabled and the queue paused when applicable;
it does not attempt to reverse database migrations. It prints the backup directory.
If the failure is transient, correct it and inspect the panel before bringing it
online. To recover the previous version, stop FPM and the queue, move the failed
panel directory aside, recreate the original directory and extract the filesystem
backup there. Restore `database.sql` into the panel database using a database
administrator, reinstall dependencies using the restored version's package manager,
and run its cache commands. Reload FPM, start the queue and run `php artisan up`. The filesystem
snapshot includes `.env`, vendor dependencies and Blueprint extension data.

## Dependency maintenance

Dependabot checks Composer, pnpm (the `npm` ecosystem) and GitHub Actions weekly.
Review upgrades in pull requests and release the tested lockfiles. Servers run `composer install` and
`pnpm install --frozen-lockfile`; they never resolve new dependency versions during
deployment.

Run `composer audit --locked --no-dev` and `pnpm audit --prod` for
runtime dependencies, plus a full audit for build dependencies. Build tools can
also have vulnerabilities; do not treat a passing runtime audit as a complete
security assessment. CI runs the panel's existing PHP and frontend checks and
additional deployment guard tests.

The tested versions, results and remaining build dependency advisories are recorded
in [VALIDATION.md](VALIDATION.md).

`php artisan p:upgrade` displays the managed update instructions and exits without
changing the installation. Use `scripts/panel-update.sh`; upstream Panel archives
would replace Aquadactyl changes and do not include this bundled Blueprint integration.

For local PHP verification on Windows, build `tests/runtime/Dockerfile`; it provides
PHP 8.5, pnpm, Composer, a dump client and ShellCheck. Pass
`--build-arg PHP_VERSION=8.4` to test the other supported PHP version. Production
deployment remains a Linux Nginx/PHP installation.
