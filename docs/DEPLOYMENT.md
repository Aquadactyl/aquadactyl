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

Use PHP 8.5 with FPM (PHP 8.4 is also supported), Composer 2, Node.js 24 or later,
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

When HTTPS is terminated by Nginx, Traefik or Dokploy, keep `APP_URL` set to the
public HTTPS address and configure `TRUSTED_PROXIES` with the IP addresses or
CIDRs of your reverse proxies. Those proxies must pass the original protocol,
host and port. A backend served over HTTP otherwise generates HTTP URLs, which
can interrupt settings saves and OAuth flows. The Docker image can serve HTTP
behind a TLS proxy without `LE_EMAIL`; see the [Docker configuration guide](../.github/docker/README.md).

After editing a native installation's `.env`, run `php artisan config:cache` and
`php artisan queue:restart`. For Docker, recreate the panel after changing its
environment so the entrypoint regenerates the cache. Use the public domain
without the container's internal port. Admin settings forms and successful-save
redirects use relative paths to preserve the browser's HTTPS origin.

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

The web file editor and image previews accept files up to 32 MiB by default.
Set `PTERODACTYL_FILES_MAX_EDIT_SIZE` in `.env` to change this limit in bytes, then
run `php artisan config:cache`. The bundled Nginx and PHP configuration accepts
100 MiB request bodies; a separate reverse proxy must also allow the size you
intend to save. Files above the editor limit can still be uploaded, downloaded,
or accessed through SFTP. This editor limit is separate from browser uploads.
Files over 1 MiB open without syntax highlighting or line wrapping to keep the
editor responsive. PNG, JPEG, GIF, WebP, AVIF, BMP and ICO images can be previewed
from their filename or the file actions menu, using the existing content-read
permission. SVG files remain available in the text editor or as downloads.

### Larger browser uploads

New nodes default to **2048 MiB (2 GiB) per file**. For existing nodes, go to
**Admin > Nodes > your node > Settings > Maximum Web Upload Filesize**, enter
the size in MiB, and save. This sends the new limit to the running Wings
instance. Existing node limits are preserved during panel updates. If Wings
is unavailable or configured to ignore panel updates, apply `api.upload_limit`
in its `config.yml` and restart Wings when convenient.

The file manager shows the limit in the Upload menu and checks files and folders
before transferring them. Large batches use at most two simultaneous transfers;
uploads have no fixed browser request timeout. Keep the tab open until the upload
finishes. Uploads still respect file creation permissions and server disk quotas.

Files travel directly from the browser to **Wings**, so increasing the panel's
PHP upload settings will not raise the server file upload limit. Any reverse
proxy in front of Wings must allow the full file plus the multipart envelope.
For a 2 GiB per-file limit, an Nginx Wings proxy can use:

```nginx
location = /upload/file {
    client_max_body_size 2080m;
    client_body_timeout 300s;
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_request_buffering off;
    proxy_send_timeout 900s;
    proxy_read_timeout 900s;
}
```

Use your actual Wings upstream and retain any forwarding headers your proxy
requires. Set the proxy body limit above your node's upload limit if increasing it
further. On Traefik/Dokploy, check any buffering middleware's
`maxRequestBodyBytes` and request timeouts. If a CDN imposes a smaller body limit,
use a directly reachable HTTPS Wings hostname for browser uploads.

The local Docker setup defaults new nodes to 2 GiB and includes a streaming upload
location in its Wings relay. It preserves limits on existing nodes; adjust those
in Admin settings. The local test daemon deliberately ignores panel configuration
updates to preserve Docker-specific paths, so rerun its setup service after
changing a node's limit and restart only Wings:

```sh
docker compose run --rm wings-setup
docker compose restart wings
```

Profile picture, logo, background, and file editor limits
continue to use their own settings.

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

See [TESTING.md](TESTING.md#dependency-audits) for audit commands. Use current audit
results when reviewing a release; historical advisory counts become stale as
dependencies and vulnerability databases change.

`php artisan p:upgrade` displays the managed update instructions and exits without
changing the installation. Use `scripts/panel-update.sh`; upstream Panel archives
would replace Aquadactyl changes and do not include this bundled Blueprint integration.

For local PHP verification on Windows, build `tests/runtime/Dockerfile`; it provides
PHP 8.5, pnpm, Composer, a dump client and ShellCheck. Pass
`--build-arg PHP_VERSION=8.4` to test the other supported PHP version. Production
deployment remains a Linux Nginx/PHP installation.

## Telemetry and troubleshooting

Aquadactyl and Blueprint telemetry are disabled by default on new installations.
Upstream Pterodactyl telemetry has been removed. Existing explicit opt-ins are
preserved during updates; the collectors check consent when they run.

With `APP_ENVIRONMENT_ONLY=false`, manage Aquadactyl's opt-in under **Admin →
Settings → Advanced Settings → Aquadactyl Telemetry**. The saved toggle overrides
the environment's initial default. Environment-only deployments can explicitly
opt in with `AQUADACTYL_TELEMETRY_ENABLED=true`. The default endpoint is:

```dotenv
AQUADACTYL_TELEMETRY_ENDPOINT=https://api.euphoriadevelopment.uk/telemetry/panel
```

Public panel installations do not need a telemetry token. When enabled, one daily
aggregate report contains an anonymous installation UUID, panel/PHP versions,
driver names, Docker availability and counts of users, servers and nodes. The
payload excludes names, emails, IP addresses, domains, server names, credentials,
tokens and request contents. The receiver can still observe the connection's
source IP. No request is made while telemetry is disabled or the endpoint is
unset. Blueprint uses its separate `telemetry_enabled` flag.

### Debug logs

Normal logging uses `LOG_LEVEL=warning`, daily files and seven days of retention.
For temporary troubleshooting, set `LOG_LEVEL=debug`, run
`php artisan config:clear` and `php artisan queue:restart`. Keep `APP_DEBUG=false`
on public deployments. Restore `LOG_LEVEL=warning` and repeat those commands when
finished.

Preview the redacted log locally before uploading:

```bash
php artisan p:debug --dry-run
```

To upload explicitly and receive a temporary share URL:

```bash
php artisan p:debug
```

The command sends a bounded tail of the configured single log or latest daily
log (256 KiB by default) to
[debug.euphoriadevelopment.uk](https://debug.euphoriadevelopment.uk). It redacts
common passwords, tokens, API keys, cookies and authorization credentials.
Redaction cannot guarantee that all sensitive data is removed; review the
preview before uploading and sharing its URL.

Pastes expire after 24 hours by default. Use `--file=/path/to/log` for another file
or `--expires=3600` for an hour. Supported expiration values are `3600`, `86400`,
`172800`, `604800` and `2592000` seconds; `0` disables automatic expiration.
