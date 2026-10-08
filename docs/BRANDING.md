# Aquadactyl branding and licensing

Reviewed on 8 October 2026 against the license bundled with this checkout and the
[upstream Panel MIT license](https://github.com/pterodactyl/panel/blob/1.0-develop/LICENSE.md).
These findings apply to this MIT-licensed Panel code; check the terms separately
when incorporating other versions, extensions or assets.

## What the Panel license permits

The MIT license permits using, copying, modifying, publishing, distributing,
sublicensing and selling the software. Releasing this modified Panel as
**Aquadactyl**, including commercially, fits those permissions. The license does
not require publishing a fork's source code or keeping Pterodactyl as the product name.

Copies or substantial portions of the software must include the original
copyright notice and permission notice. Keep [LICENSE.md](../LICENSE.md) with
source archives, Docker images and other distributions. Preserve the original
copyright and license headers in inherited files, along with third-party notices.
Changing the product name does not transfer ownership of the upstream code.

The MIT text does not require a particular UI footer. Aquadactyl retains visible
upstream credit as well as the original license. The original authors keep credit
for the upstream project's history.

## Names and artwork

The upstream license identifies Pterodactyl with the registered-mark symbol.
Its MIT software terms contain no explicit trademark license. Do not infer
permission to present Aquadactyl as an official Pterodactyl release or to use
upstream marks as Aquadactyl's identity. The README identifies this as an
independent fork, and Pterodactyl remains in factual attribution and compatibility
references. The login and panel headers use the supplied Aquadactyl wordmark,
and browser icons use its emblem. The supplied artwork is stored separately from
upstream assets; see [brand assets](THEME.md#brand-assets) for the files and generation command.

This review establishes software-license permissions; it does not establish
trademark clearance for the name Aquadactyl.

Blueprint's code has a separate [MIT license](../deploy/BLUEPRINT-LICENSE.md),
which must also accompany distributions of that code. Its artwork has different terms:

- [.blueprint/assets/LICENSE](../.blueprint/assets/LICENSE) reserves rights and
  expressly prohibits use in other products, redistribution and modifications.
  Those assets are already bundled here, and Blueprint's initialization and default
  extension icons use some of them. Retaining this notice does **not** authorize
  redistribution. Obtain separate permission or replace/remove the affected artwork
  and its runtime references before distributing it with Aquadactyl.
- [Blueprint badge terms](../.blueprint/assets/Badges/LICENSE) permit qualifying
  extensions to display unmodified badges under their stated conditions. They do
  not grant a general license to all Blueprint artwork.

The artwork and its notices are retained unchanged in this naming change. The
Panel rebrand does not resolve that separate Blueprint artwork permission issue.

## Compatibility identifiers

The following Pterodactyl identifiers remain intentionally:

| Identifier | Reason |
| --- | --- |
| `Pterodactyl\` PHP namespaces and class names | Existing Blueprint extensions, Composer autoloading and application classes |
| `config/pterodactyl.php`, `pterodactyl.*` and `settings::pterodactyl:*` | Existing configuration, saved settings and extension APIs |
| `PTERODACTYL_*` environment variables and `PTERODACTYL_DIRECTORY` | Existing environment settings and Blueprint extension scripts |
| `window.PterodactylUser` and the `Pterodactyl` JavaScript namespace | Existing frontend and admin integrations |
| `/themes/pterodactyl/`, `pterodactyl.css` and legacy asset filenames | Extension stylesheets and asset URLs |
| `application/vnd.pterodactyl.v1+json` and Wings identifiers | API clients and the existing Wings protocol |
| `/etc/pterodactyl`, game image URLs and egg author addresses | The separately installed Wings daemon and upstream egg provenance |
| `pteroq.service` and `p:*` Artisan commands | Existing services, deployment scripts and administration workflows |
| Upstream URLs, author details, changelog history and license notices | Accurate provenance, troubleshooting references and license obligations |

The admin overview links to Aquadactyl releases. The upstream CDN is still used
by the existing version service, including Wings checks; its Panel version is not
treated as the latest Aquadactyl release. `p:upgrade` now directs users to the
managed Aquadactyl updater and makes no installation changes.

## Existing installations

The updater preserves `.env` and existing settings. Operators can keep
`/var/www/pterodactyl`, their database user, the existing queue service and Wings
configuration. Deployment scripts determine the panel directory from their own
location. Set `BACKUP_DIR` to keep an existing backup directory; the new default
is `/var/backups/aquadactyl`.

For new installs, `.env.example` sets `APP_NAME=Aquadactyl`,
`MAIL_FROM_NAME="Aquadactyl Panel"` and `DB_USERNAME=aquadactyl`. The example
Nginx, queue and cron configurations use `/var/www/aquadactyl`. They do not move
existing directories or create database credentials.

To update an existing installation's display name, set `APP_NAME=Aquadactyl` and
`MAIL_FROM_NAME="Aquadactyl Panel"` in `.env`. When database-backed settings are
enabled, update the saved Panel Name and mail From Name in admin settings as well.
Keep your actual `DB_USERNAME`; changing branding does not rename a database account.

Changing `APP_NAME` also changes derived cache, Redis and session prefixes.
Pin `CACHE_PREFIX`, `REDIS_PREFIX` and `SESSION_COOKIE` to their previous values
before changing that name if you want to preserve their existing keys. For an
installation using the uncustomized Pterodactyl defaults, these are:

```dotenv
CACHE_PREFIX=pterodactyl_cache_
REDIS_PREFIX=pterodactyl_database_
SESSION_COOKIE=pterodactyl_session
```

Use your existing values if the installation already had a custom name or
prefixes. Legacy fallback prefixes remain unchanged when `APP_NAME` is absent.
Refresh Laravel's configuration cache and restart queue workers after editing
environment settings, as the managed deployment scripts do.
