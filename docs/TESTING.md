# Panel testing and coverage

The panel has separate React/Vitest and PHP/Pest suites. Both coverage configurations count untested source files. A passing test count alone does not mean the whole application is covered.

## Frontend

Use Node.js 24 and the pnpm version declared in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm run test:coverage
pnpm run test:game-query
```

The Vitest suite requires 100% statements, branches, functions and lines across `resources/scripts/**/*.{ts,tsx}`. Open `coverage/index.html` for the report. The separate game-query tests check the standalone query protocol script; that Node test suite is not included in the React coverage percentage. Vendor assets, Blueprint shell scripts and Blade markup are also outside the React denominator.

GitHub Actions runs the 100% gate and uploads the report as `frontend-coverage`. Add a behavior test for every new branch, including permission failures, disabled features and transport errors.

## PHP in an isolated Docker workspace

The coverage stack uses its own MariaDB database and workspace. It mounts the source read-only, copies `.env.ci` instead of your panel `.env`, and does not use the panel's application or database volumes. Composer dependencies are cached between runs; database data is temporary.

```sh
docker compose -f compose.tests.yaml build php
docker compose -f compose.tests.yaml run --rm php
```

The default command runs the entire unit and integration suite, generates Clover and HTML reports, fails on PHPUnit warnings, and checks the current 75% line-coverage floor. Open `coverage-php/html/index.html`; the text summary is `coverage-php/summary.txt` and Clover XML is `coverage-php/clover.xml`.

To work on a particular area without collecting coverage:

```sh
docker compose -f compose.tests.yaml run --rm php tests/Integration/Api/Remote --no-coverage
docker compose -f compose.tests.yaml run --rm php --bootstrap vendor/autoload.php tests/Unit/Repositories/Wings --no-coverage
```

To audit the requested full 100% PHP target:

```sh
docker compose -f compose.tests.yaml run --rm php --coverage --min=100 --coverage-clover=/reports/clover.xml --coverage-html=/reports/html
```

This audit will fail until all executable lines in `app/` are tested. PCOV measures line coverage; it does not establish branch or path coverage. The PHP suite has not yet reached 100%. Its coverage report identifies the remaining console, admin, request-validation, repository and Blueprint paths.

Stop only the test stack when finished:

```sh
docker compose -f compose.tests.yaml down
```

Keep the dependency volumes for the next run. This command does not stop the panel, Wings or telemetry containers.

## CI and test design

The PHP matrix checks PHP 8.4/8.5 with MariaDB 10/11 and MySQL 8/9. Unit tests also run with `DB_HOST=UNIT_NO_DB` to detect accidental database access. The PHP 8.5/MariaDB 11 job collects whole-suite PCOV coverage, enforces the 75% minimum and uploads `php-coverage`.

Use real request validation and database transactions for API permission and ownership tests. Fake Wings, S3, OAuth and outbound HTTP at their transport boundaries. Assert the result and side effects: a denied request must not call a daemon or delete a resource, failed work must roll back, and logs or responses must not disclose credentials.

The exception handler rolls back active transactions when rendering an error. Tests using `DatabaseTransactions` should make a single error-producing request per fixture; later requests cannot safely reuse models removed by that rollback.

Code style checks are `pnpm run lint`, `pnpm run types` and `vendor/bin/pint --test`. The separate API repository documents its unit, coverage and PostgreSQL/Redis suites in `docs/TESTING.md`.
