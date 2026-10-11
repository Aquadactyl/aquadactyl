# Performance and build caching

Account and server screens load when their routes are opened. The shared route
registry exposes navigation without eagerly importing the terminal, charts,
account security forms, or every server management screen. Vite handles shared
chunks automatically; forced vendor groups previously pulled chart dependencies
into the app entry bundle.

Tailwind scans `resources/` and Blueprint addon components, views, and wrappers.
Explicit addon sources cover Blueprint's symlinks. This gives host and Docker
builds the same source scope and avoids scanning unrelated documentation,
backend files, and framework templates.

## Measurements

Measured on the local Windows development checkout with Node 24.14.0 and pnpm
12.10.1. Build timings are the median of three production builds with dependencies
already installed. JavaScript sizes include the app entry and the route's static
imports, counting each chunk once.

| Measurement                               |          Before |         After |
| ----------------------------------------- | --------------: | ------------: |
| Dashboard initial JavaScript              | 1,660,863 bytes | 686,545 bytes |
| Dashboard JavaScript with gzip (estimate) |   510,240 bytes | 225,686 bytes |
| App entry JavaScript and static imports   |   695,258 bytes | 551,996 bytes |
| Production frontend build                 |    3.44 seconds |  1.39 seconds |

These measure bundle size and local build duration. Network speed, addons, server
load, and cache state also affect page load time.

Validation passed: 139 frontend tests, TypeScript, lint, production Docker build,
and a frontend rebuild inside the runtime image. A backend-only edit reused all
frontend steps in a 2.16-second frontend-target build. Browser checks covered
account pages, server navigation and console rendering with a simulated daemon,
and the mobile account layout. HTTP checks verified asset compression, immutable
asset caching, and uncached missing assets. All three Nginx templates passed
syntax validation, and PHP-FPM reported OPcache enabled with the expected profile.
A linked addon fixture also generated CSS utilities from components, views, and
wrappers, verifying the explicit Blueprint scan paths.

## Docker builds

The frontend stage copies its package manifests, Vite configuration, TypeScript
configuration, `resources/`, `public/`, and `.blueprint/extensions/`. Core PHP,
migration, and documentation edits can reuse the compiled frontend. Frontend,
Blueprint extension, or dependency changes rebuild it.

BuildKit cache mounts retain npm, pnpm, and Composer downloads on the builder.
Dependency layers still use the lockfiles. After copying backend source, Composer
generates its optimized autoloader and runs installation hooks without repeating
dependency installation. Cache mounts are kept outside the resulting image.

Use `docker compose build panel` for normal rebuilds. The build's plain progress
output shows `CACHED` for reused steps; `--no-cache` forces those steps to run again.

## Serving assets and PHP

Docker's Nginx configuration compresses Vite assets and gives their content-hashed
URLs a one-year immutable cache lifetime. Rebuilding changes those URLs. The Linux
Nginx template also recognizes Vite asset names alongside legacy asset hashes.

Docker uses the same PHP performance profile as Linux deployment, including
OPcache, the interned-string cache, and the realpath cache. Timestamp validation
keeps PHP changes visible after Blueprint updates.

References: [React lazy loading](https://react.dev/reference/react/lazy),
[Docker cache mounts and layer reuse](https://docs.docker.com/build/cache/optimize/),
[Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files),
and [PHP OPcache settings](https://www.php.net/manual/en/opcache.configuration.php).
