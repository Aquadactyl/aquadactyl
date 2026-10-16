# Performance and build caching

## Request and font optimizations (16 October 2026)

Blade partials now share one asset composer and public appearance configuration
per request. The composer refreshes its configuration when the request changes,
including when a long-running application retains the composer. This removes
repeated dependency construction and Blueprint settings reads without caching
authentication or permissions. Application boot also reads version metadata once
instead of twice.

The server-list endpoint now uses an accessible-server ID subquery for both
normal access and the administrator exclusion filter. Pagination no longer needs
to fetch every accessible server into PHP first. The existing batched page
relationships, response fields and permission checks are preserved.

Inter remains self-hosted. Unicode subsets let the browser fetch only the scripts
used on the page: the normal Latin font is 48,256 bytes instead of 352,240 bytes.
Italic, extended Latin, Greek, Cyrillic and Vietnamese remain available, with
source URLs and checksums in `public/fonts/inter/subsets.json`. Content-hashed
font URLs receive one-year immutable caching in all three Nginx templates; older
font files remain available for previously cached stylesheets.

These changes were measured against the already optimized working tree described
below and Pterodactyl v1.15.1 at
`e98678c5a1d07a74036660a459d87a4eb7c105c1`. All three stacks used fresh,
separate databases, the same 50-server fixture, four PHP-FPM workers, PHP 8.5.11
and matching CPU/memory limits. Browser runs used ten cold/warm pairs per panel;
API runs used three 10-second windows at each concurrency. The shared benchmark
Nginx configuration was unchanged, so the new production font cache headers are
validated separately and are not credited in the timings.

| Measurement (median)                    | Previous Aquadactyl |   Candidate | Pterodactyl |
| --------------------------------------- | ------------------: | ----------: | ----------: |
| Cold HTML TTFB                          |             17.7 ms |     15.4 ms |     13.3 ms |
| Cold dashboard ready                    |            197.0 ms |    198.3 ms |    325.6 ms |
| Cold first contentful paint             |            124.0 ms |    124.0 ms |    180.0 ms |
| Cold resource transfer                  |           800.6 KiB |   504.1 KiB |   570.8 KiB |
| Account API, concurrency 16             |         281.9 req/s | 284.4 req/s | 258.9 req/s |
| 50-server-list API, concurrency 16      |          74.7 req/s |  77.3 req/s |  18.1 req/s |
| Server-list p95 latency, concurrency 16 |            258.8 ms |    252.0 ms |    962.0 ms |
| Loaded panel container working set      |           127.6 MiB |   155.5 MiB |   148.1 MiB |

The candidate transferred 37.0% less than the previous Aquadactyl build and 11.7%
less than Pterodactyl. Server-list throughput improved 3.4% over the previous
build and was 4.3 times Pterodactyl's. Dashboard readiness was essentially
unchanged from the earlier optimization and 39.1% faster than Pterodactyl's;
HTML TTFB still trailed Pterodactyl by 2.1 ms. All 70,396 measured API responses
passed status and JSON checks. A separate request profile recorded 14 queries
before, 13 after, and 310 for Pterodactyl, excluding console bootstrap.

There is no measured memory improvement. The Docker-style working set includes
active file cache and kernel cache. Supplementary idle snapshots after the run
showed 82.5/82.9 MiB of anonymous memory before/after, but 0.9/24.9 MiB of active
file cache and 3.3/7.3 MiB of reclaimable slab. Those cache differences dominate
the higher candidate total; the measurements do not establish a PHP memory
reduction or a leak. Shared image pages and their cgroup ownership also limit
comparisons between concurrently running containers.

This is a localhost comparison on one shared Windows/WSL2 workstation, with
unrelated game containers running, warm server caches, no TLS or network
throttling, and suspended fixture servers. Dashboard readiness means all 50
server names are present in the DOM. The results do not establish WAN/mobile
performance, live Wings performance or maximum production capacity.

Validation passed: 1,508 frontend tests with 100% statements, branches, functions
and lines; 1,753 PHP tests (24,991 assertions) with 100% line coverage; TypeScript,
frontend lint, PHP style, scoped PHP static analysis and production frontend
builds. All three Nginx templates passed syntax validation. The rebuilt local
Docker panel passed desktop/mobile login, immutable font caching, uncached
missing-font responses and API authentication checks. The font browser check
also covered local-only downloads, multilingual italic glyphs and a 390-pixel
dashboard.

[Recorded samples, summaries and source checksums](performance/2026-10-16.json)
include the pinned revisions, applied source hashes and benchmark methodology.
The `before` source already contains the router/batching work below. The
candidate's recorded file hashes supersede the parent image's inherited hashes
for those paths. To repeat a two-way comparison, build clean checkouts of the
recorded revisions with the recorded patches, then use the website repository's
`scripts/prepare-runtime-benchmark.mjs <aquadactyl> <pterodactyl>
--include-working-tree` and `scripts/benchmark-runtime.mjs <prepared-directory>
<report.json>`. Preserve its fixtures and limits, and run browser, API and memory
phases without test runners competing for CPU.

## Runtime optimization measurements

On 15 October 2026, separate before/after instances were measured from base
commit `a42ce0af63c5`, with the runtime performance changes applied only to the
candidate. Both used PHP 8.5.11, four static FPM workers, the same production
dependencies, two CPU quota cores and 1 GiB per panel, and matching database and
Redis limits. Each had 50 suspended server records owned by one non-admin user.

| Measurement                                 |      Before |       After |
| ------------------------------------------- | ----------: | ----------: |
| Cold-browser dashboard ready, median of ten |    570.3 ms |    176.9 ms |
| Cold-browser first contentful paint         |    418.0 ms |    112.0 ms |
| Account API, concurrency 16                 | 265.5 req/s | 313.5 req/s |
| 50-server-list API, concurrency 16          |  19.9 req/s |  82.8 req/s |
| Loaded panel container working set          |   129.3 MiB |   127.4 MiB |

The server list batches page relationships and server-specific variable values,
and reuses loaded parents during allocation transformation. A separate request
profile dropped from 310 SQL queries to 14, excluding application bootstrap.
Variable overrides remain isolated per server, including empty values; hidden
variables and allocation-note restrictions still follow the existing permissions.

API-key usage timestamp saves avoid repeating validation queries for unchanged
identity fields. Token lookup, authorization, revocation/expiry checks and
last-used timestamp persistence remain active; key creation and edits retain
full validation. The entry point resolves only the requested initial router shell
before mounting App, with a spinner while loading, avoiding the initial
lazy/Suspense reveal delay. Later routes remain lazy and retain error handling.

The API figures are medians of three 10-second persistent-connection windows.
All 47,531 measured responses passed status and JSON checks. Memory is the median
of 30 loaded samples, calculated as cgroup usage minus inactive file cache; the
observed memory improvement is modest and idle memory was essentially unchanged.
Dashboard ready is a custom DOM milestone, distinct from window load and browser
paint metrics. These local workstation results do not establish WAN/mobile
performance or universal production capacity.

Validation: 1,508 frontend tests with 100% coverage, 43 focused backend tests
(286 assertions), TypeScript, frontend lint, scoped format checks, static analysis
of changed PHP files and a production Vite build. Full samples, the patch and
reproduction commands are in the website repository's
`docs/panel/optimization-benchmarks.mdx` and `public/benchmarks/` artifacts. The
earlier Pterodactyl comparison remains pinned to its original source revisions.

## Frontend loading and builds

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
