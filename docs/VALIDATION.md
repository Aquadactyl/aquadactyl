# Validation results

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

## Dependency audit limits

The full pnpm audit reports six advisories in development dependencies: four
moderate and two high. Affected packages include `dset`,
`postcss-selector-parser`, SockJS's `uuid`, `braces` and `sprintf-js`.
These are inherited build tool dependencies; the production dependency audits
are clean. Review upgrades to the older tooling separately, test Blueprint
compatibility and keep extension packages and build inputs under trusted control.

Dependency postinstall scripts are blocked unless reviewed in
`pnpm-workspace.yaml`. The current Font Awesome and core-js packages need no
install scripts because their published code is ready to use.

## PHP compatibility changes

The supported range is PHP 8.4 and 8.5, with PHP 8.5 as the deployment default.
Composer resolves against PHP 8.4 so the lockfile remains installable on both.
MySQL SSL settings use the PHP 8.4+ `Pdo\Mysql` constants to avoid PHP 8.5
deprecations. The recovery token test now verifies bcrypt and a cost of at least
12 rather than requiring the older cost of 10. PHP CS Fixer was updated to a
version that supports PHP 8.5 while retaining the repository's existing style.
