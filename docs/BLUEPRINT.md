# Bundled Blueprint

The framework source comes from
[Blueprint beta-2026-08](https://github.com/BlueprintFramework/framework/releases/tag/beta-2026-08).
Its release ZIP was verified against SHA256
`38bcee33b19abcbb3460578236ead74668ec39a7861200bbc6902a9152ac118d`.
The provenance is recorded in `deploy/blueprint-release.json`; the upstream MIT
license is included in `deploy/BLUEPRINT-LICENSE.md`. Artwork retains its upstream
license files under `.blueprint/assets/`.

The panel includes Blueprint's backend, extension routes, admin pages, client
hooks, components, migrations and CLI. Installation initializes links, settings
and placeholders from the bundled files. Once installed:

```bash
cd /var/www/pterodactyl
sudo blueprint -version
sudo blueprint -i myextension
```

Aquadactyl uses pnpm 12.10.1 for framework installation, extension rebuilds and
development commands. See [addon development](ADDONS.md) for the shared dependency
catalogue and examples. Extension scripts that invoke Yarn should be updated to
use pnpm before installation on this fork.

Keep `myextension.blueprint` in this directory for future panel updates. Install
extensions from publishers you trust: their PHP, frontend and shell scripts become
part of the panel. Installing extensions can change ownership, so reapply the
deployment permissions after extension maintenance:

```bash
sudo bash -c 'source scripts/deploy/common.sh; preflight; finish_deployment'
```

This integration retains the panel's security headers, newer server identifiers,
file draft persistence, maintenance labels, Unicode console support and server
conflict screens. The existing dependency declarations are retained and updated
rather than replaced with Blueprint's older versions.

The integration also removes the legacy OpenSSL build option, deduplicates and
parallelizes extension egg queries, gives scheduled metadata tasks a stable daily
time, and reads serialized settings without instantiating PHP classes. Plain
settings written through the panel's settings repository remain readable.

The pnpm migration fixes declaration generation for shared compound components
such as buttons, dropdowns, inputs and transitions. With frontend dependencies
installed, run `node scripts/helpers/generate-types.js` to regenerate the
Blueprint declarations under `.blueprint/dist/types/`.

`blueprint -upgrade` is disabled for this fork because the stock command replaces
core panel files and dependency manifests. Update the panel and framework together
using `scripts/panel-update.sh`. Maintainers can upgrade the bundled framework by
reviewing a specific upstream release, verifying its checksum, merging its hooks
into the current panel, updating the provenance and running the full checks before
publishing a new fork release. Do not extract a stock framework release over this
fork without reviewing its changes.
