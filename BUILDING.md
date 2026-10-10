# Developing Aquadactyl

Aquadactyl uses React, TypeScript, Tailwind CSS and Vite, with Blueprint
beta-2026-08 bundled. Use pnpm to install dependencies and compile panel or theme
changes. Production installation is covered in the
[hosted installation guide](https://aquadactyl.uk/docs), with script details in
the [deployment reference](docs/DEPLOYMENT.md).

The project website is [aquadactyl.uk](https://aquadactyl.uk). Its operator guides
cover [installation](https://aquadactyl.uk/docs),
[updates](https://aquadactyl.uk/docs/updating) and
[Blueprint](https://aquadactyl.uk/docs/blueprint). Website content is maintained
in the [website repository](https://github.com/Aquadactyl/website); its
[README](https://github.com/Aquadactyl/website#run-locally) covers website development.

## Instant local setup with Docker

Install Docker with the Compose plugin (Docker Desktop on Windows/macOS), then
run this from the panel repository:

```bash
docker compose up -d --build --wait --wait-timeout 600
```

The first build downloads dependencies and compiles the current checkout. Compose
starts MariaDB, Redis, the panel and Wings, waits for initialization, and
automatically creates the application secrets, database tables, default eggs,
Blueprint, a local administrator and a connected Wings node. No host PHP,
Composer, Node.js or `.env` file is required.

Open **[http://localhost:8081](http://localhost:8081)** and sign in with:

- Email: `admin@aquadactyl.test` (or username `admin`)
- Password: `AquadactylLocal123!`

This testing stack binds to `127.0.0.1` and uses its own `aquadactyl-test` Compose
project, image and named volumes. The database, application key and storage survive
container recreation. Existing accounts and edited eggs are preserved on later
starts. Use the separate deployment guide for public hosting.

To rebuild only the panel in an existing stack, run these commands from the current
source checkout, using the same Compose project and configuration files as before:

```bash
docker compose build panel
docker compose up -d --no-build --no-deps --wait --wait-timeout 180 panel
```

The image compiles fresh Vite assets into `public/build/` and includes the Node
dependencies needed for Blueprint rebuilds and game queries. Local build output
and the Vite development server marker are excluded from the Docker build context.

Blueprint addon installation and removal each use one command. Put the package
in `/app` and, from a root shell inside the panel container, run:

```bash
blueprint -i mytheme
blueprint -r mytheme
```

These commands build assets, run required addon migrations, restore permissions,
refresh caches and queue workers, and gracefully reload PHP. Use the install
command again to update the addon, or add `--yes` to removal to skip its prompt.
From the host, use `docker compose exec panel blueprint -i mytheme` or
`docker compose exec panel blueprint -r mytheme`.
See [the Blueprint reference](docs/BLUEPRINT.md) for package compatibility.

Profile pictures are stored in `storage/app/public/avatars` inside the persistent
storage volume. The `public/storage` link exposes them to the web server. Linux
installations need `php artisan storage:link` and GD with PNG, JPEG and WebP support;
retain these files alongside the database when backing up or moving the panel.

To choose a different port or initial credentials, set `AQUADACTYL_PORT`,
`AQUADACTYL_ADMIN_EMAIL`, `AQUADACTYL_ADMIN_USERNAME` and/or
`AQUADACTYL_ADMIN_PASSWORD` in your shell before the first start. In PowerShell:

```powershell
$env:AQUADACTYL_PORT = '8082'
$env:AQUADACTYL_ADMIN_PASSWORD = 'MyLocalTestPassword123!'
docker compose up -d --build --wait --wait-timeout 600
```

Changing the initial account variables does not change an existing account's
password. Update that through the panel instead.

```bash
# Inspect startup, application services and mail sent to the log driver.
docker compose logs -f panel
docker compose exec panel sh -c "tail -f storage/logs/laravel*.log"

# Stop the test instance, retaining its data.
docker compose down

# Start again, or rebuild after editing panel source files.
docker compose up -d --build --wait --wait-timeout 600
```

To deliberately reset this test instance and delete its database and storage, run
`docker compose down --volumes` before starting again. Container-local Blueprint
extension changes must be exported before rebuilding or recreating the panel.

The **Local Wings** node appears under [Admin > Nodes](http://localhost:8081/admin/nodes).
It advertises 8 GiB RAM and 32 GiB disk for server placement, and provides ten local
allocations, `localhost:25565` through `localhost:25574`. Create test servers through
the panel's normal server creation page. Game containers bind their allocated ports
to the Docker host's loopback interface. Wings listens at
`http://wings.localhost:8082`, with SFTP available at `localhost:2022`.

Wings uses the Docker socket to create sibling game containers. Its configuration,
server files, backups and logs are kept in named volumes. The setup service reuses
the node and credentials on later starts. Browsers resolve `wings.localhost` to the
host; the panel's internal loopback proxy forwards backend requests to Wings.

The local bootstrap keeps Wings' port-publishing interface at `127.0.0.1` and
uses the Docker bridge gateway only for IPAM. This lets Docker Desktop publish
game ports on localhost. If an older stack reports a binding error for a
`172.x.x.x` address, regenerate its Wings configuration without recreating the
panel, then restart Wings:

```bash
docker compose run --rm --no-deps wings-setup
docker compose restart wings
```

Start the affected server again through the panel after Wings is ready.

Set `AQUADACTYL_WINGS_PORT`, `AQUADACTYL_SFTP_PORT` or `AQUADACTYL_GAME_PORTS`
(a range such as `25600-25609`) before starting to change those ports. The data mount
matches the Docker daemon's volume path so Wings and game containers share the same
files. If `docker info --format '{{.DockerRootDir}}'` reports a path other than
`/var/lib/docker`, set `AQUADACTYL_DOCKER_ROOT` to that path before the first start.

```bash
# Add Wings to an already-running test panel without recreating the panel.
docker compose up -d --build --no-recreate --wait --wait-timeout 120 wings

# Inspect Wings startup and automatic node setup.
docker compose logs -f wings wings-setup
```

When adding Wings to a panel container built before this setup was introduced,
rebuild the panel first so it includes the internal Wings proxy. Stop or delete game
servers through the panel before resetting the test stack; their sibling Docker
containers are managed by Wings rather than Compose.

## Requirements

- Node.js 22.13 or later.
- pnpm 12.10.1, pinned in `package.json`.
- PHP 8.4 or 8.5 and Composer 2 for backend work. Deployment defaults to PHP 8.5.
  GD must support PNG, JPEG and WebP for profile-picture uploads.

Install the pinned package manager, then the locked dependencies:

```bash
npm install --global pnpm@12.10.1
pnpm install --frozen-lockfile
composer install
```

Blueprint uses the installed pnpm dependency tree for extension builds.
Dependency install scripts require an explicit decision in `pnpm-workspace.yaml`.
Keep `package.json`, `pnpm-lock.yaml` and that configuration together in commits.
Yarn is no longer used by Aquadactyl.

## Development builds

```bash
# Build the current frontend.
pnpm run build

# Rebuild when source files change.
pnpm run watch

# Check types, lint and run frontend tests.
pnpm run types
pnpm run lint
pnpm run test
```

Build at least once to create `public/build/manifest.json`, which the panel needs
to render its frontend. Blueprint's CLI also uses pnpm when it installs or removes
an extension and rebuilds those assets.

See the [Blueprint guide](https://aquadactyl.uk/docs/blueprint) for installing
extensions and [addon development](docs/ADDONS.md) for available libraries, imports
and dependency conventions. Use the panel's React 16.14 runtime when building addons.

## Hot module reloading

Run `pnpm exec vite --host 127.0.0.1` to start the Vite development server at
`http://127.0.0.1:5173/`. It writes `public/hot`, which tells Laravel to use the
development assets. Configure `server.hmr.host` in `vite.config.ts` for the
hostname you use in your browser; its current default is `aquadactyl.test`.
Optional HTTPS uses `USE_LOCAL_CERTS=true` and certificates under
`../../docker/certificates/`. HMR updates React components while you work.
Run `pnpm run build` after stopping the development server to remove `public/hot`
and return to production assets.

## Production builds

```bash
pnpm run build
```

This generates minified assets and a manifest under `public/build/`. Managed
Linux deployment builds the frontend and refreshes backend caches automatically.

## Backend checks

```bash
composer validate --strict
composer audit --locked --no-dev
vendor/bin/pest --bootstrap vendor/autoload.php tests/Unit
vendor/bin/pest tests/Integration
composer cs:check
```

Integration tests require a disposable database configured through `.env.ci`;
their bootstrap resets and seeds that database. On Windows, the
`tests/runtime/Dockerfile` provides the Linux verification tools. Its
`PHP_VERSION` build argument defaults to `8.5` and also accepts `8.4`.

The Nix development shell uses PHP 8.5, Node.js 22 and pnpm. Install the pinned
pnpm version above if the version provided by your Nix package set differs.

## Site settings

Use **Admin → Settings → General** to change the site name, upload a site logo,
and enable or disable player counts, custom profile pictures, sensitive data blur,
and server list quick actions for everyone. Database-backed settings require
`APP_ENVIRONMENT_ONLY=false`; both Compose examples enable this by default.
Reload open pages after saving settings.

Logos accept PNG, JPEG or WebP images up to 2 MB and 4096 pixels per side. They
are re-encoded as PNG, scaled to fit within 1200 × 600 without cropping, and
stored on the public storage disk. Ensure `php artisan storage:link` has been run
and the web server can serve `/storage/`. The local Docker image handles this.
The logo appears on sign-in, client navigation and admin pages, and supplies
browser favicons, Apple touch icons, Safari pinned-tab masks and Windows tiles.
Icons fit the logo into a square without cropping or stretching; square logos
work best. Restoring the default also restores the default browser icons.
The configured site name supplies browser titles and home-screen shortcut names.
Enable **Show Site Name Beside Logo** in General settings when your uploaded logo
does not include your provider's name. This displays the site name beside the
logo in client navigation, sign-in and admin headers. The default is **Logo only**.
Icon and manifest URLs change with either branding setting to refresh browser
caches. Branding endpoints are public so they also work before sign-in.

Disabling custom profile pictures hides saved pictures and blocks new uploads.
Disabling sensitive data blur overrides users' preferences and blocks changes.
Saved pictures and preferences return when these features are enabled again.
Disabling player counts stops game queries as well as hiding counts. Disabling
quick actions hides the shortcuts while leaving controls on server pages available.

## Server list and game queries

Click anywhere on a server card to open its console. Individual shortcuts remain
independently accessible, and server links support opening in a new tab.

Set a node's **Country** under **Admin → Nodes → Settings** to display its flag
on the server list. Countries are optional and apply to every server on that node.
The flag assets are served locally from `public/flags/`.

The server list offers Console, Files, Start, Restart and Stop according to the
viewer's existing server permissions. Power actions use the same API and activity
logging as the server console.

Player counts use [GameDig](https://github.com/gamedig/node-gamedig). Supported egg
names are detected automatically; choose a game or disable queries under
**Admin → Servers → Details → Game Player Counts**. Minecraft Java uses TCP status,
Bedrock uses UDP ping, and Steam/Source games use their query protocol. A failed
query displays **Unavailable**, rather than reporting zero players.

For games with a separate query port, assign that port to the server and select
it in the query settings. The panel and its queue worker must be able to reach
that port using the game's TCP or UDP protocol. A node's optional **Game Query
Address** overrides the allocated IP when a different reachable address is needed.
The local Compose stack connects the panel to the game container network and
queries local containers directly.

Keep the locked Node dependencies installed on the panel/worker host, even after
building the frontend. Queries run on the `low` queue and cache results for 30
seconds; run a worker that includes this queue. The Docker image already provides
Node and the dependencies. Set `GAME_QUERY_ENABLED=false` to disable querying or
`GAME_QUERY_NODE_BINARY` to use a different Node executable.

The protocol fixtures can be checked without running game servers:

```bash
pnpm test:game-query
```

## Wings

The local Docker stack includes Wings. For a production Linux node, Wings is a
separate Go service. The
[node setup section](https://aquadactyl.uk/docs#wings) links to the
[Wings documentation](https://pterodactyl.io/wings/1.0/installing.html) to configure
a node. Build and run it in its own repository on Linux.
