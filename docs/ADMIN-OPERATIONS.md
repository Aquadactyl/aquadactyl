# Server domains and administration

Apply migrations and rebuild frontend assets when updating to this version:

```bash
php artisan migrate --force
pnpm install --frozen-lockfile
pnpm run build
php artisan optimize:clear
php artisan queue:restart
```

## Server subdomains with Cloudflare

Open **Admin > Service Management > Server subdomains**. Add a domain such as
`play.example.com`, the Cloudflare zone ID for `example.com`, and an API token
restricted to **Zone / DNS / Edit** on that zone. Your current panel password is
required. Tokens are encrypted with the panel's application key and never returned
by the client API. Use **Replace API token** to rotate a credential.

The domain must already belong to that Cloudflare zone. Aquadactyl does not buy
domains, change nameservers or open firewall ports. Leave the public IP override
empty to use each server's primary allocation, or enter the public game-server IP
when allocations use NAT or private addresses. Use separate domain pools for hosts
that need different public IP overrides.

Owners and subusers with **Settings / Rename** permission can choose an address
under **Server > Settings**. No client controls appear without an enabled domain.
Each server can reserve one address. Remove it and wait for cleanup before choosing
another. Names are unique within their domain and existing unmanaged DNS records
are never overwritten. A/AAAA records use **DNS only**, with Cloudflare proxying off.

The optional Minecraft Java SRV record lets compatible Java clients omit the port.
Other games, including Bedrock, can still require `hostname:port`. This feature
does not create HTTP reverse proxies or TLS certificates for game servers.

Keep the normal `standard` queue worker and `schedule:run` cron enabled. DNS changes
run in the queue; `p:subdomains:sync` retries failures and follows primary allocation
IP/port changes every five minutes. Deleted servers retain their DNS ownership
until cleanup succeeds. Disabling a domain prevents new reservations but keeps
existing DNS working; admins can remove records from the management page. A domain
cannot be deleted while managed records still require cleanup.

If a record reports an error, check the zone ID, scoped token, available public IP,
and conflicting DNS names. DNS propagation depends on cached resolver answers.
The API behavior is based on [Cloudflare's DNS records API](https://developers.cloudflare.com/api/resources/dns/subresources/records/).

## Install and remove Blueprint addons from the admin area

Open **Admin > Extensions > Install Blueprint addon**, upload a `.blueprint` ZIP
package, confirm your current password, and acknowledge the publisher trust prompt.
Check **Allow this package to replace an existing extension** only for an intended
update. The page shows queued, installing, installed and failed states.

To uninstall an addon or theme, choose **Remove** below its card in **Admin >
Extensions**. Confirm your current password and the removal acknowledgement.
Blueprint runs its normal uninstall process, including addon removal hooks and an
asset rebuild. **Recent Blueprint activity** shows removal progress and failures.
The framework itself cannot be removed through this page. An extension with an
operation already pending must finish before a removal can be queued.

Removal can permanently delete addon settings and data. Keep a backup; the panel
does not provide an undo action. Removal uses the same opt-in worker as uploads
and requires a currently installed extension and a valid administrator at execution.

Packages can run PHP, JavaScript and shell hooks with server privileges. Back up
the database and panel before installing trusted code. Package validation rejects
unsafe archive paths, symlinks, reserved identifiers, more than 10,000 entries,
manifests above 64 KiB, expanded archives above 512 MiB and uploads above 50 MiB.
These checks validate packaging; they do not establish that addon code is safe.

The web server does not receive sudo access. A separate, opt-in root worker handles
only installation and removal records, verifies upload hashes and the requesting admin's access,
and runs the existing Blueprint installer one package at a time. It is separate
from the regular unprivileged Laravel queue. CLI installation remains available:

```bash
blueprint -i addon
blueprint -r addon
```

The local Docker Compose stack enables and supervises the dedicated worker. For a
Linux installation with the panel at `/var/www/aquadactyl`:

1. Set `AQUADACTYL_BLUEPRINT_WEB_INSTALL_ENABLED=true` in `.env` and rebuild the
   configuration cache if you use one.
2. Install `deploy/systemd/aquadactyl-blueprint-installer.service` under
   `/etc/systemd/system/`. Adjust the PHP executable and panel path for your host.
3. Start the worker:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now aquadactyl-blueprint-installer
   ```

The worker needs the same PHP, Node, pnpm and Blueprint dependencies as the CLI.
It uses the panel's shared cache and database. Adjust PHP `upload_max_filesize`,
`post_max_size` and Nginx `client_max_body_size` to allow the package size; a 50 MiB
upload needs a slightly larger total request limit. Queue status omits raw child
process output to avoid exposing secrets; inspect the private Blueprint CLI logs
for installation errors. Jobs interrupted for over 35 minutes are marked failed
for review rather than automatically executing the package again.

Disable the environment flag and stop the dedicated service to disable web
installation and removal. Keep the normal Laravel queue running as its usual web user.

## Panel maintenance

Use **Admin > Settings > General > Panel maintenance** and optionally set a message.
Choose **Preview maintenance page** to see the current message, including unsaved
edits, in a new tab without changing the maintenance toggle. The preview is only
available to administrators. The page uses your panel logo, primary colour and
login background settings, including blur and overlay, and keeps an administrator
sign-in link visible. Clear the message to use the translated default.
Users receive HTTP 503 with `Retry-After: 60` and no-store caching. Administrators
retain access and sign-in/recovery endpoints remain available. Running game
servers, scheduled tasks and authenticated daemon callbacks continue normally.
This does not change individual node maintenance or Laravel's deployment
`artisan down` command. Native deployment maintenance still takes precedence.

For CLI recovery, remove the saved flag and refresh cached configuration:

```bash
php artisan tinker --execute="app(\Pterodactyl\Contracts\Repository\SettingsRepositoryInterface::class)->set('settings::aquadactyl:maintenance:enabled', 'false');"
php artisan optimize:clear
```

## Logs and daemon overview

**Settings > Logs** renders escaped text with whitespace preserved and a line-wrap
toggle. The page previews the last 256 KiB to bound browser memory; use **Download
full log** for older entries. Symlinks to other files are excluded from viewing,
downloading and deletion. Logs remain accessible only to administrators.

**Service Management > Daemon overview** probes the configured nodes through the
panel backend, with three simultaneous browser requests, short timeouts and a
15-second backend cache. The visible page refreshes every 30 seconds. Each card
shows three separate resource sections:

- **Game-server usage / node capacity:** Combined RAM, CPU and disk usage from the
  daemon's current server statistics, compared with configured node capacity.
  CPU is measured in threads: 100% of one CPU equals one thread. Network counters
  show received and sent bytes reported by those servers.
- **Assigned limits / total:** Fixed server limits, remaining assignment capacity,
  unlimited limits and overassignment. RAM and disk totals include configured
  overallocation; a -1 overallocation setting is explicitly unlimited. A server
  with a zero limit does not reserve a fixed amount and is counted separately.
  Assignment capacity is not a guarantee of physically free RAM, CPU or disk.
- **Whole-machine usage / total:** Host RAM, CPU and server-data filesystem usage
  when the daemon advertises support. Current Manta exposes this through the
  authenticated `/api/system/usage` endpoint. RAM excludes memory the kernel marks
  as available, CPU uses a short sample across all threads, and disk refers to the
  filesystem containing the configured game-server data directory. In Docker these
  measurements describe the Linux host and mounted data filesystem visible to
  Manta, rather than Windows host resource counters.

Stock Wings still provides game-server usage and assignments. Its standard system
endpoint does not expose host utilization, so those values are marked unavailable.
Both legacy flat and modern nested system payloads are supported. Missing or failed
measurements never become zero usage. Requests use a shared 15-second cache and
bounded timeouts; game-server configurations and credentials are not returned in
the overview API. System version and platform details remain in each card's
expandable section.
