# Performance

## Browser startup

The HTML preloads the requested router's static module dependencies so the browser
can fetch them before the app entry executes. Other routes and dialogs remain
lazy; navigation search loads when opened. Development/HMR and incomplete
manifests use the normal entry loader.

Core `panel` labels are embedded with the selected locale and installed fallbacks
using Laravel's safe JavaScript serializer. i18next initializes them before React
mounts, removing the initial translation request. Addon namespaces still load
through the locale endpoint, using the same placeholder conversion.

A matched before/after run on 16 October 2026 compared these changes against
`b5cc74ecb11d`, with 50 suspended server records, four PHP-FPM workers and a
2 CPU / 1 GiB quota per panel. Each profile had ten cold/warm pairs per variant,
alternating order, after discarding a warm-up pair. Dashboard readiness means all
50 server names are present in the DOM; paint metrics are recorded separately.

| Median measurement                      |    Before |     After |
| --------------------------------------- | --------: | --------: |
| Localhost cold dashboard ready          |  185.5 ms |  186.9 ms |
| Throttled cold dashboard ready          | 3284.6 ms | 2931.1 ms |
| Throttled cold first contentful paint   |   2718 ms |   2402 ms |
| Throttled cold largest contentful paint |   2900 ms |   2574 ms |
| Throttled warm dashboard ready          |  915.4 ms |  923.3 ms |
| Cold document + resource transfer       | 506.3 KiB | 488.1 KiB |
| Warm document + resource transfer       |   4.4 KiB |  12.3 KiB |

The throttled Chromium profile used a 1440×900 viewport, 150 ms latency, 1.6 Mbps
download, 750 kbps upload and 4× CPU throttling. Cold readiness improved 10.8%;
localhost and warm readiness were effectively unchanged. Inline labels add about
7.9 KiB to warm full-page loads. The throttled cold `load` event occurred later
(1765.4 → 2137.2 ms) because module preloads participate in it; dashboard readiness
and paint improved despite that event moving later.

These are simulations on one shared Windows/WSL2 workstation with warm server
caches and unrelated game containers running. They do not establish real-device,
field or maximum-capacity results, and are separate from the Pterodactyl comparison.

## Server requests and fonts

- Server-list relationships and per-server variables are batched for the current
  page. Accessible-server IDs use a database subquery instead of first loading
  every accessible server into PHP. Permissions and variable overrides remain
  server-specific.
- Blade partials share one asset composer and public appearance configuration per
  request. Long-lived composers refresh that data when the request changes.
- API-key usage timestamps avoid repeating identity validation for unchanged
  fields. Authentication, authorization, revocation and expiry checks still run.
- Self-hosted Inter uses Unicode subsets. The Latin font is 48,256 bytes instead
  of 352,240 bytes; other scripts and italic remain available. Font sources and
  checksums are in [subsets.json](../public/fonts/inter/subsets.json).

The separate 16 October runtime comparison measured Aquadactyl at 198.3 ms cold
dashboard readiness versus 325.6 ms for Pterodactyl, and 77.3 versus 18.1 requests/s
for a 50-server list at concurrency 16. Aquadactyl's loaded container working set
was higher (155.5 versus 148.1 MiB); these results do not establish a memory win.
See the [full comparison and methodology](https://aquadactyl.uk/docs/panel/panel-comparison)
for pinned revisions, raw samples, source provenance and limitations. Historical
before/after results remain in the website's
[optimization guide](https://aquadactyl.uk/docs/panel/optimization-benchmarks).

## Frontend and Docker builds

Account and server screens load on demand. Navigation uses a shared route registry
without eagerly importing terminals, charts or account security forms. Vite
handles shared chunks; forced vendor groups would pull unnecessary dependencies
into the initial entry.

Tailwind scans panel resources and explicit Blueprint component, view and wrapper
paths, including linked addons. It avoids unrelated backend and documentation
sources. Build measurements and their locked dependencies are documented in the
[frontend benchmark guide](https://aquadactyl.uk/docs/panel/benchmarks).

The Docker frontend stage copies its manifests, build configuration, resources,
public files and Blueprint extensions separately from backend source. PHP,
migration and documentation edits can reuse compiled frontend layers. BuildKit
cache mounts retain pnpm and Composer downloads outside the final image;
dependency installation still uses lockfiles.

```bash
docker compose build panel
```

Normal builds reuse cached steps; `--no-cache` forces them to run again. See
[BUILDING.md](../BUILDING.md) for rebuilding an existing local deployment.

## Serving assets and PHP

Nginx compresses Vite assets and gives content-hashed assets and fonts one-year
immutable caching. Rebuilds change the URLs. Missing files are not cached as
successful assets. Docker and native Linux deployments share PHP OPcache,
interned-string and realpath-cache settings; timestamp validation keeps Blueprint
updates visible.

Use the [test and coverage commands](TESTING.md) when changing these paths. Browser
checks should include initial translations, lazy search, route isolation, asset
caching and a narrow viewport. Keep benchmark fixtures and quotas identical, run
timing phases without competing test/build jobs, and report tradeoffs alongside gains.
