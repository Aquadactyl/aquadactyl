# Validation results

## Two-factor input contrast — 9 October 2026

The 2FA dialogs' separate input component inherited a white background from the
forms plugin while keeping light text. It now delegates to the shared themed
input, preserving spacing and forwarded refs. Code/password labels are connected
to their fields, and the login checkpoint shows proper visible labels.

The production Docker browser check verified setup and disable inputs, recovery
codes, placeholders, aqua focus borders, label clicks, and a forced autofill
pseudo-state. Text contrast for the fixed fields measured 15.34:1. Desktop,
390px, and 320px layouts had no horizontal overflow or JavaScript errors.
Mocked enable/disable responses and a mocked login checkpoint exercised the UI
without changing real 2FA settings. All 131 frontend tests, type checking, lint,
formatting, and the production Docker build passed.

## Friendly server schedules — 9 October 2026

The timing editor now offers minute/hour intervals and daily, weekly, and monthly
choices, with advanced cron available for existing complex expressions. New
schedules start paused and lead directly to adding steps. The schedule page has
enable/pause controls, readable actions and waits, and next-run dates formatted
in the panel's configured timezone.

All 131 frontend tests, type checking, lint, formatting, and the changed PHP
file's style check passed. New tests cover cron conversion, preserving advanced
expressions, interval boundaries, timezone/daylight saving formatting, delay
limits, and switching between basic and advanced editing. The production Docker
image built and the local panel was recreated successfully.

Live browser checks created, edited, and removed one temporary paused schedule.
Weekly, minute, hour, and advanced timings round-tripped through the real API;
command and restart steps preserved their payloads and five-minute waits. No
schedule executed. Separate API mocks verified enable/pause controls, next-run
timezone display, invalid-wait validation, and dropdown Escape behaviour at
390px and 320px. Neither mobile width had horizontal page overflow.

The persisted environment checksum, user/server/node/settings/migration counts,
and original schedule/task counts were preserved. The running Minecraft
container retained its original start time. Euphoria remained removed.

## CI repair — 9 October 2026

The PHP workflow now invokes Pest for both suites and supplies a minimal Vite
manifest with the real entrypoint's `src` field for rendered views. Vitest omits
the Laravel server plugin, so `CI=true` does not start or bypass the development
server. The test configuration gives the large image fixtures a 512 MiB memory
budget, and the five PHP formatting failures were corrected.

Both PHP 8.4 and 8.5 passed all 102 unit tests (196 assertions each) with database
access disabled. The full PHP 8.5 integration suite passed against isolated
MariaDB 11: 427 tests and 2,599 assertions, including JPEG and WebP uploads.
PHP style checks passed across all 984 files, and the locked production Composer
audit reported no advisories. All 74 Vitest tests passed with `CI=true` on Linux
Node 22 and Windows Node 24, and the production frontend build passed with CI
enabled. The database fixtures were separate from the running panel.

## Pull request branch on current main — 9 October 2026

The Blueprint, Docker and UI changes were rebased onto the latest main branch,
retaining its dependency updates, CodeMirror 6 editor, React 16 avatar support
and Vitest migration. Type checking, lint, formatting of the changed frontend
files, all 74 Vitest tests, six game-query protocol tests, ShellCheck and the
deployment and Blueprint failure guards passed. Production frontend and Docker
image builds passed, including rebuilding the frontend inside the Docker runtime.
The production dependency audit reported no known vulnerabilities. The build
workflow now uses `pnpm run test` so CI runs the configured Vitest runner.
Subsequent PHP suite results are recorded in the CI repair section above.

## Console prompts, dropdowns and server creation — 9 October 2026

Frontend type checking, lint, production builds and all 75 tests passed. Console
prompt tests cover plain and ANSI-coloured startup output and preserving other
log messages. The Java Yolks entrypoint was inspected to confirm it supplies
the upstream prompt independently of the panel and Wings.

Browser checks of the production Select component passed for controlled and
default values, real native change events, forwarded focus refs, grouped and
disabled options, multi-value form submission, required-field focus, descriptions,
asynchronously loaded options, programmatic changes and native form reset.
Formik blur and submit worked, and selecting options or dismissing the dropdown
with Escape left the surrounding Headless UI dialog open.

Live Docker checks verified custom dropdowns in client activity filters and
admin server creation. The creation form had 32px column gutters at 1440px and
stacked fields at 390px and 320px without page overflow. All its admin selects
used Select2, including Docker images. No browser JavaScript errors occurred.

The rebuilt Docker deployment retained the Euphoria addon installed during the
update, including all eight private files matching the pre-update backup. User,
server, node and settings counts and the application environment checksum were
preserved; Blueprint refreshed its asset-cache version during startup. The panel
was healthy after recreation, and the existing Minecraft container continued
running. Live console output displayed the Aquadactyl prompt for cached Yolks
startup messages.

## Docker deployment with Vite — 9 October 2026

The Linux amd64 panel image built with PHP 8.5.11 and pnpm 12.10.1. All 35
Vite manifest asset references resolved inside the image, frontend rebuilding
worked in the runtime container, and all six game-query protocol tests passed.
The Dockerfile now copies `public/build/` from the frontend stage; the build
context excludes local Vite output and `public/hot` while retaining static SVGs.

Blueprint's help, version, info and debug scripts were missing because the
unanchored `misc` Git ignore rule also excluded `scripts/commands/misc/`.
Those scripts were restored from the bundled beta-2026-08 release after verifying
its SHA-256 against `deploy/blueprint-release.json`. The ignore rule now applies
only to the root directory, and Blueprint's info command reports pnpm.
Blueprint installation and extension install/remove rebuilds also stopped passing
Webpack's `--progress` flag, which Vite rejects.

The existing Docker panel was recreated using its persistent volumes. Database
counts remained at two users, two servers, one node, 74 settings and 202
migrations; the persisted environment checksum and stored image count also
remained unchanged. Blueprint initialization and application cache generation
completed, and Nginx, PHP-FPM and the queue worker were running. Live browser
checks passed for sign-in, dashboard, account, admin, Blueprint, console and
files, including 390px and 320px dashboard layouts, with no missing assets or
JavaScript errors. These checks used the running panel and Wings.

## Theme follow-up with Vite — 9 October 2026

The current checkout uses Vite 8.3.3, TypeScript 6.0.3, Oxlint and Oxfmt.
The production frontend build, type checking, lint and all 73 frontend tests
passed. Jest still emits a warning that TypeScript 6 is outside ts-jest 28's
tested range; the current suites pass despite that warning.

The production browser check caught the generated avatar's UMD export being
passed to React as an object. Avatar now handles both the component and wrapped
export, preserving uploaded profile pictures. A regression test reproduces the
wrapped export. This matches Vite 8's documented
[CommonJS import behaviour](https://vite.dev/guide/migration.html#consistent-commonjs-interop).

Input, textarea and button variants were corrected for the installed Tailwind 3
compiler. Focus, hover and active styles now emit CSS; disabled and read-only
controls retain their existing behaviour. Narrow navigation keeps the built-in
actions visible, and long panel names truncate or wrap within their container.

Headless Edge previews reviewed the production Vite assets on dashboard,
account, login, console, file manager and error pages, including keyboard
search and the upload drag overlay. Custom names, logos and logo/name pairings
passed at 320px, 390px, 768px and 1440px without page overflow or broken images.
The default navigation actions also fit at 320px without horizontal scrolling.
Admin controls used representative HTML with the actual admin/Blueprint CSS.
API responses and the Wings WebSocket were mocked, and PHP suites were not
rerun for this frontend follow-up.

Checkbox/select SVG URLs now encode spaces correctly, select arrows use a valid
CSS calculation, button links retain hover styles, and disabled opacity emits
CSS. The console uses xterm 6's `selectionBackground` theme option for aqua text
selection.

The current palette contrast pairs measure body text at 12.42:1, interface card
text at 11.50:1, secondary text on raised admin surfaces at 5.51:1, primary button
text at 4.69:1 and aqua links on interface cards at 9.14:1. The palette guide and
build commands were updated for the current files and installed libraries.

## Hosted documentation links — 8 October 2026

Panel documentation and in-app links use `https://aquadactyl.uk` and the website
repository's `/docs`, `/docs/updating` and `/docs/blueprint` routes. Public routes
returned HTTP 200. Website build, TypeScript, lint and formatting checks passed;
browser checks verified the updated guides and section links at desktop and phone
widths. The panel production build, Blade compilation, Composer validation and
lint for its changed frontend component also passed. Website guide changes are
prepared in the local website checkout and require deployment to appear online.

## Supplied Aquadactyl logos — 8 October 2026

The supplied Desktop artwork was copied without changing the original PNGs.
Trimmed logos and PNG/ICO icon sizes were generated with PHP GD; all manifest
and Windows tile paths resolve to existing files. The production build,
TypeScript, ESLint, Blade compilation and PHP style checks passed. Browser
previews checked login and client headers at desktop and phone sizes, custom
panel names, and expanded/collapsed admin logos. Logos loaded successfully,
and the client pages had no horizontal page overflow or browser errors.
These previews used fixture data rather than a live deployment.

## Aquadactyl naming changes — 8 October 2026

PHP 8.5 unit tests passed: 96 tests and 173 assertions, including the legacy
upgrade command redirect. All 52 frontend tests passed, as did TypeScript,
ESLint on changed frontend files, the production frontend build, Blade template
compilation, Composer validation, PHP style checks on changed PHP files with
PHP 8.4, ShellCheck on changed shell scripts and the existing updater guard tests.
Original license files and Composer dependency versions were verified unchanged.
The full integration and deployment smoke suites below were not rerun for this
naming change. The separate Blueprint artwork restriction is documented in
[BRANDING.md](BRANDING.md#names-and-artwork).

## Previous full validation

Validated on 7 October 2026 with PHP 8.4.26 and 8.5.11, Laravel 12.69.3,
pnpm 12.10.1 and Node.js 22.23.3 in the Linux deployment fixture. Local frontend
checks also passed with Node.js 24.14.0.

| Check                                             | Result                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| PHP unit tests on 8.4 and 8.5                     | 95 passed, 170 assertions on each version                                      |
| PHP integration tests with MariaDB on 8.4 and 8.5 | 377 passed, 2,083 assertions on each version                                   |
| PHP test deprecations                             | None; CI fails on deprecations                                                 |
| Frontend tests                                    | 52 passed, including all six avatar variants on React 16                       |
| TypeScript, ESLint and production frontend build  | Passed                                                                         |
| Default theme browser preview                     | Passed at desktop and phone sizes, using fixture data                          |
| Blueprint declaration generation                  | Passed; shared component declarations emitted                                  |
| PHP coding style                                  | Passed across 945 files, with follow-up checks on changed PHP files            |
| ShellCheck and update guard tests                 | Passed, including rejection of unsupported PHP, Node and pnpm versions         |
| Composer and pnpm production dependency audits    | No known advisories                                                            |
| Production Docker build                           | Passed with PHP 8.5 and pnpm                                                   |
| Nix development configuration evaluation          | Shell and image derivations passed after updating nixpkgs and the MySQL client |

## Default theme preview

Reviewed the production client bundle in headless Microsoft Edge at 1440px and
390px widths: dashboard, account, login, console and file manager. The error
page, file context menu, upload drag overlay and login focus state were also
checked. All navigation actions fit at 320px; the 390px pages had no horizontal
page overflow. Console resource values remain at a readable 16px on desktop.
Keyboard focus on Search was visible, and Enter and Escape opened and closed
the search dialog. The upload overlay opened and dismissed correctly.

Admin tables, forms, Select2 menus, checkboxes and a Bootstrap modal were
reviewed using representative HTML with the panel's actual admin and Blueprint
stylesheets. No browser page errors remained. API responses and the Wings
WebSocket were mocked for these visual checks; this was not a live deployment.

Contrast checks for the default palette measured body text at 10.96:1, card
text at 8.94:1, secondary text on raised surfaces at 4.73:1, primary button
text at 4.69:1 and aqua links on cards at 7.28:1. These checks cover the listed
pairs, not every possible addon or component state.

Browser validation found two React 16 compatibility regressions introduced by
dependency resolution. `boring-avatars` is pinned to 1.7.0 to avoid its newer
React `useId` dependency, and `@preact/signals-react` is pinned to the panel's
previously locked 1.2.1 to avoid a production dispatcher conflict. Runtime
dependency audits remain clean. Recheck browser behaviour before updating
these packages or the React major version.

## Linux installation and update fixture

The isolated Linux fixture installed Blueprint, checked public links, assets,
route registration and restrictive permissions, and created a SQL backup. It
then installed a sample Blueprint extension that imports Axios, Lucide,
React Hook Form, its Zod resolver, Zod, Zustand, React Select and Lodash ES.
The extension passed TypeScript checking and compiled into the production bundle.

The fixture applied a verified release archive using pnpm and confirmed that
`.env`, extension data, its injected hook and the Blueprint version remained
correct. The updater created SQL and filesystem backups and exited maintenance
successfully. A subsequent extension rebuild also passed with the pinned pnpm
version check enabled.

Systemd operations were stubbed in the container. Confirm the actual FPM service,
socket, certificates and domain on the target Linux host using the
[deployment guide](DEPLOYMENT.md). These checks do not measure live server performance.

The Nginx template previously passed syntax validation with temporary test
certificates. This migration changes its FPM socket default to PHP 8.5; ensure
the selected socket exists on your host.

## Blueprint CLI lifecycle

The isolated Docker fixture installed, updated and removed a sample theme with
`blueprint -i` and `blueprint -r`. It verified the compiled client hook, addon
migration, preserved private data during an update, removal from the active
extension list, cached routes and views, web user ownership and graceful PHP-FPM
reloads. The panel served its login page after each operation. The fixture also
confirmed the CLI shortcut is recreated on startup when Blueprint is already
initialized.

The existing Euphoria package also passed `blueprint -i euphoriatheme` and
`blueprint -r euphoriatheme --yes` in an isolated copy of the deployment image.
The live deployment retained its installed Euphoria files, extension list,
application secrets and database record counts. Its Minecraft container kept
the same start time throughout the panel update.

The fixture passed with Docker's `nginx:nginx` ownership and with the managed
Linux installer's `root:nginx` code ownership. Cached configuration and application
secrets retained mode `0640`; runtime directories retained web user ownership.
The systemd reload branch was not exercised by this Docker fixture.

Failure guards passed on the PHP 8.4 and 8.5 runtime images: dependency, install
build, uninstall build and cache failures return a nonzero status, report no
success and release the Blueprint lock. ShellCheck and the existing deployment
update guards passed. These fixtures use an isolated database and do not modify
installed user addons or game servers.

## Dependency audit limits

The 9 October pnpm audit reports three advisories in development dependencies:
two moderate and one high, affecting `postcss-selector-parser`, `braces` and
`sprintf-js`. The production dependency audit is clean. The earlier Webpack
audit reported six advisories; the current dependency graph no longer includes
that tooling. Review upgrades to the remaining build dependencies separately, test Blueprint
compatibility and keep extension packages and build inputs under trusted control.

Dependency postinstall scripts are controlled through the explicit `allowBuilds`
list in `pnpm-workspace.yaml`, which currently includes esbuild, Font Awesome
and core-js. Review changes to this list alongside dependency updates.

## PHP compatibility changes

The supported range is PHP 8.4 and 8.5, with PHP 8.5 as the deployment default.
Composer resolves against PHP 8.4 so the lockfile remains installable on both.
MySQL SSL settings use the PHP 8.4+ `Pdo\Mysql` constants to avoid PHP 8.5
deprecations. The recovery token test now verifies bcrypt and a cost of at least
12 rather than requiring the older cost of 10. PHP CS Fixer was updated to a
version that supports PHP 8.5 while retaining the repository's existing style.
