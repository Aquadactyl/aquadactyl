# Developing Aquadactyl

Aquadactyl uses React, TypeScript, Tailwind CSS and Webpack, with Blueprint
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

## Requirements

- Node.js 22.13 or later.
- pnpm 12.10.1, pinned in `package.json`.
- PHP 8.4 or 8.5 and Composer 2 for backend work. Deployment defaults to PHP 8.5.

Install the pinned package manager, then the locked dependencies:

```bash
npm install --global pnpm@12.10.1
pnpm install --frozen-lockfile
composer install
```

The pnpm configuration uses a flat `node_modules` layout for Blueprint compatibility.
Dependency install scripts require an explicit decision in `pnpm-workspace.yaml`.
Keep `package.json`, `pnpm-lock.yaml` and that configuration together in commits.
Yarn is no longer used by Aquadactyl.

## Development builds

```bash
# Build development assets.
pnpm run build

# Rebuild when source files change.
pnpm run watch

# Check types, lint and run frontend tests.
pnpm run tsc
pnpm run lint
pnpm exec jest --runInBand
```

Build at least once to create `public/assets/manifest.json`, which the panel needs
to render its frontend. Blueprint's CLI also uses pnpm when it installs or removes
an extension and rebuilds those assets.

See the [Blueprint guide](https://aquadactyl.uk/docs/blueprint) for installing
extensions and [addon development](docs/ADDONS.md) for available libraries, imports
and dependency conventions. Use the panel's React 16.14 runtime when building addons.

## Hot module reloading

`pnpm run serve` starts the HTTPS Webpack development server at
`https://aquadactyl.test:5173/`. The existing local development environment expects
certificates under `../../docker/certificates/`; configure `webpack.config.js`
and the `serve` script for your own hostname and certificates when needed.
`WEBPACK_PUBLIC_PATH` must match the URL from which the browser loads development
assets. HMR updates React components while you work.

## Production builds

```bash
pnpm run build:production
```

This generates minified assets and a manifest under `public/assets/`. Managed
Linux deployment builds the frontend and refreshes backend caches automatically.

## Backend checks

```bash
composer validate --strict
composer audit --locked --no-dev
vendor/bin/phpunit --bootstrap vendor/autoload.php tests/Unit
vendor/bin/phpunit tests/Integration
composer cs:check
```

Integration tests require a disposable database configured through `.env.ci`;
their bootstrap resets and seeds that database. On Windows, the
`tests/runtime/Dockerfile` provides the Linux verification tools. Its
`PHP_VERSION` build argument defaults to `8.5` and also accepts `8.4`.

The Nix development shell uses PHP 8.5, Node.js 22 and pnpm. Install the pinned
pnpm version above if the version provided by your Nix package set differs.

## Wings

Wings is a separate Go service. The
[node setup section](https://aquadactyl.uk/docs#wings) links to the
[Wings documentation](https://pterodactyl.io/wings/1.0/installing.html) to configure
a node. Build and run it in its own repository on Linux.
