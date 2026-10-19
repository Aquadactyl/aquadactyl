# Server domains and administration

Apply migrations and rebuild frontend assets when updating to this version:

```bash
php artisan migrate --force
pnpm install --frozen-lockfile
pnpm run build
php artisan optimize:clear
php artisan queue:restart
```

## Integrated status page

Open **Admin > Settings > Status page**. The feature starts disabled. Choose
**Anyone (public)** or **Signed-in users only**, then publish individual nodes
with a public service label. No nodes are published automatically. Visitors see
those labels, daemon reachability and your service notices; addresses, tokens,
node names and individual server details are omitted.

The page is available at `/status` and appears in client navigation when enabled.
It uses the panel branding, Inter font and primary colour. It remains accessible
during the panel's UI maintenance mode, subject to its own visibility setting.
It still requires this panel and its database to be running, so use an external
monitor as well if you need independent detection of a complete panel outage.

Keep the panel's minute scheduler running. `php artisan p:status:collect` performs
the first check immediately; later checks run every minute with four concurrent
daemon requests and short timeouts. Page visitors read stored results and a
20-second cache, without probing the daemons. Checks older than three minutes
show **Unknown**, rather than a cached healthy result.

The availability figure uses the last 30 days of recorded up/down samples.
Maintenance and missing samples do not count toward its denominator. It measures
daemon reachability, not the health of every game server or a wall-clock SLA.
Samples older than 30 days are pruned. Unpublishing a service also removes its
samples. Post and edit plain-text service updates with Investigating, Identified,
Monitoring or Resolved states; the public page shows active updates and the ten
most recently resolved notices. Keep private information out of these messages.

## Discord ownership roles

1. Configure Discord under **Admin > Settings > OAuth** so users can link an
   existing Discord account from their Account page.
2. Invite a Discord bot to your Discord server with **Manage Roles** permission.
   Place its highest role above the roles it will assign. Enable Discord's
   Developer Mode to copy guild and role IDs. Users must join the Discord server
   themselves; Aquadactyl does not auto-join or message them.
3. Open **Admin > Settings > Discord roles**, enter the guild ID and bot token,
   confirm your current panel password, and enable synchronization. The bot token
   is distinct from the OAuth client secret, encrypted at rest and never returned
   to clients, displayed, included in audit payloads or flashed after validation.
4. Add rules for a role ID, optionally an egg and node, and a minimum number of
   matching owned servers. Both filters must match. Different rules for the same
   role combine with OR. Running and stopped servers count; suspended, installing
   and failed servers do not. Missing/deleted egg or node filters never silently
   become "any" filters.

Changes to server ownership, egg, node, account suspension and Discord linking
queue a check. The scheduler also reconciles all linked accounts and tracked
grants every five minutes, covering bulk updates and daemon installation callbacks.
Keep a queue worker consuming **low** alongside the normal **high,standard** queues.
Use **Queue synchronization now** or `php artisan p:discord:sync-roles` to enqueue
a reconciliation; Discord work stays off web requests.

Aquadactyl tracks only roles it assigned, including a pending assignment whose
HTTP result is uncertain. Roles already present before it grants them are not
claimed or removed. Tracked roles are removed when no rule matches, a user is
suspended or unlinks Discord, or a rule is disabled/deleted. Deleted users retain
cleanup records until revocation succeeds. Restoration does not immediately
regrant roles until the next queued check completes. This is eventual consistency,
normally within five minutes while the scheduler, worker and Discord are available.

Rate limits respect Discord's response headers and retry delays through the queue.
Invalid credentials or permissions apply a shared cooldown, with sanitized errors
shown on the settings page. Fix the token, guild membership, role IDs, permission
or hierarchy, then save and retry. Role grant/revoke events appear in Audit logs.

Disabling the integration pauses synchronization and retains current roles. For a
clean shutdown or a guild change, disable/delete its rules while sync is still on,
wait for managed grants to reach zero, then disable the bot or change the guild.
Guild changes are rejected while tracked grants still need cleanup.

The implementation uses Discord's documented
[member role endpoints](https://discord.com/developers/docs/resources/guild#add-guild-member-role)
and [rate-limit headers](https://discord.com/developers/docs/topics/rate-limits).

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

## Create infrastructure while creating a server

Use **Create node** beside the node selector in **Admin > Servers > Create**.
The dialog creates the node and a first IP/port allocation, selects them, and keeps
the server form intact. Its **Create location** step also keeps the node draft.
The normal **Create node** page has the same location action, including when the
panel has no locations yet.

A new node still needs a running Wings or Manta daemon. Follow **Configure daemon**
after creating it, then return to the preserved server form. Initial node limits
use MiB, and the first allocation must use an IP on that host and an available
game-server port. More allocations and advanced node settings remain available
on the node's management pages.

## Suspend and restore user accounts

Open **Admin > Users > user > Account access**, enter your current administrator
password, optionally record a private reason, and choose **Suspend user and owned
servers**. Suspension blocks sign-in, existing authenticated requests, API calls
and new SFTP authentication. Remember-me credentials are rotated, and existing
daemon connections are revoked through the queue. An administrator cannot suspend
their own account or submit the action after their administrator access is revoked.

Owned servers receive a separate account suspension flag. **Restore user access**
removes that flag and allows sign-in again, while preserving manual server
suspensions and the server's install state. It does not start stopped servers.
Servers created for or reassigned to a suspended owner inherit the restriction.
Restoring an account also makes its existing API keys usable again.

Keep the `high` queue and scheduler running. Daemon changes run in the background;
the user page reports pending updates and connection failures. Offline or
transferring nodes retain the desired panel state and are retried every minute
with `p:users:sync-suspensions`. Ordinary server unsuspension cannot bypass an
account suspension. Other users' servers are unaffected by the account flag.

## Audit administrator and user activity

Open **Admin > Management > Audit logs**. Search by actor username/email, action or
route, IP, activity type and dates. Results are paginated and include existing
user/server activity, new administrator web changes and application API writes.
Administrator records identify the actor, route template, method, HTTP status,
affected mapped records, timestamp and IP. Read-only administrator page views do
not generate audit entries.

The view omits arbitrary activity properties, and new administrator request
records never copy request bodies, query strings, passwords or API credentials.
Activity retention uses the existing `APP_ACTIVITY_PRUNE_DAYS` setting (90 days
by default). The regular activity pruning task applies to these records too.

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

## Webhooks and update notes

Use **Admin > Settings > Webhooks** to add up to 20 Discord or generic JSON
destinations. Choose event subscriptions, enter a URL, enable the destination and
confirm your current password. URLs and JSON signing secrets are encrypted at rest
and never redisplayed. Blank fields preserve saved credentials. **Test saved
webhook** sends the saved configuration; save edits before testing. Removing a
destination also removes its delivery history.

Destinations must use public HTTPS on port 443. Each delivery resolves DNS again,
rejects private/reserved addresses, pins the validated address while retaining TLS
hostname verification, and refuses redirects and environment proxies. Discord
webhooks use confirmed delivery and suppress mentions. Forum webhooks can include
`thread_id`. JSON receivers require a shared random secret of at least 32 characters.

Subscriptions cover system actions, health transitions for published status
components, incident publication/changes/resolution/removal, available releases and
detected installed version changes. System actions include administrator changes,
server provisioning, power, backups, reinstallation, suspension and managed Discord
roles. Payloads include internal action/actor/subject IDs and admin route templates;
they exclude request bodies, credentials, commands, file paths, emails and IPs.
Incident messages and published component names are included. Editing webhook
settings does not recursively notify the same webhook.

Run the normal panel scheduler every minute and ensure a worker consumes the
`low` queue. The scheduler queues due retries, recovers interrupted deliveries and
prunes completed history after 30 days. Network failures, HTTP 429 and HTTP 5xx
retry with delays for at most five attempts within 24 hours. Other HTTP failures
stop immediately. A failed delivery can be retried manually while its destination
is enabled and unchanged. Changing delivery configuration cancels older pending
deliveries. Deliveries are **at least once**: receivers should deduplicate the
`X-Aquadactyl-Delivery` header, including manual retries.

Generic JSON requests contain `schema`, `id`, `event`, `occurred_at` and `data`.
`X-Aquadactyl-Event` identifies the event. Verify the signature against the exact
raw request bytes before decoding JSON:

```php
$timestamp = $_SERVER['HTTP_X_AQUADACTYL_TIMESTAMP'] ?? '';
$signature = $_SERVER['HTTP_X_AQUADACTYL_SIGNATURE'] ?? '';
$body = file_get_contents('php://input');
$expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, getenv('WEBHOOK_SECRET'));
if (!ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300 || !hash_equals($expected, $signature)) {
    http_response_code(401);
    exit;
}
// Persist the delivery ID to reject duplicates, then process the verified event.
```

Use **Settings > Updates** to queue a check or opt into hourly checks. Checks fetch
the latest stable release from `Aquadactyl/aquadactyl`, `Aquadactyl/manta` or
`pterodactyl/wings` and read the authenticated daemon system endpoint. Select Manta
explicitly for nodes whose version string does not identify the fork. Checks run
in the background and never install software. GitHub metadata is cached for an
hour; unavailable nodes retain their last known installed version with an error.

The first successful observation establishes an installed-version baseline.
Subsequent version changes can notify subscribed webhooks; a product selection
change alone does not count as an installation. Available-update notices compare
stable `X.Y.Z` versions only and are deduplicated per destination revision and
installed/latest version pair while their delivery history is retained (30 days).
Canary and custom builds cannot be ordered reliably.
Docker builds carry a stable build fingerprint to detect a changed canary image.

The administration overview and footer include an **Installed version notes**
dropdown sourced from the bundled `CHANGELOG.md`. Release notes from GitHub appear
after a successful background check. Both render Markdown with raw HTML and unsafe
links removed. A repository without a published release shows that state without
treating it as a failed check.
