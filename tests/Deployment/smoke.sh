#!/usr/bin/env bash
set -Eeuo pipefail
# Run in the disposable tests/runtime image with this repository mounted at /source.
# DB_HOST, DB_DATABASE, DB_USERNAME and DB_PASSWORD must identify a disposable database.
[[ -f /source/artisan && "$PWD" == /app && ! -e /app/artisan ]] || exit 1
tar -C /source --exclude=node_modules --exclude=vendor --exclude=.git --exclude=.env --exclude=storage/framework -cf - . | tar -C /app -xf -
cp .env.example .env
export APP_ENV=production APP_DEBUG=false APP_ENVIRONMENT_ONLY=true APP_URL=https://panel.test
export CACHE_STORE=redis CACHE_DRIVER=redis SESSION_DRIVER=redis QUEUE_CONNECTION=redis REDIS_HOST=redis
export MAIL_MAILER=array PTERODACTYL_TELEMETRY_ENABLED=false
mkdir -p /tmp/panel-smoke-bin
printf '#!/bin/bash\nexit 0\n' > /tmp/panel-smoke-bin/systemctl
chmod +x /tmp/panel-smoke-bin/systemctl
export PATH="/tmp/panel-smoke-bin:$PATH"
bash scripts/panel-install.sh
test -f .blueprint/extensions/blueprint/private/db/is_installed
test -L public/extensions/blueprint
test -f public/assets/manifest.json
test ! -f storage/framework/down
test "$(stat -c %a .env)" = 640
test "$(stat -c %U app/Http/Kernel.php)" = root
test "$(stat -c %U storage)" = www-data
mkdir -p /var/backups/aquadactyl
php artisan p:maintenance:backup-database /var/backups/aquadactyl/smoke.sql
test -s /var/backups/aquadactyl/smoke.sql
test "$(stat -c %a /var/backups/aquadactyl/smoke.sql)" = 600
php artisan route:list --path=extensions
printf '%s\n' 'Installation smoke checks passed: Blueprint, assets, permissions, cache, routes and SQL backup.'

# Install an extension with a client hook and retain data across a release update.
mkdir -p /tmp/panel-smoke-extension/{components,data}
cat > /tmp/panel-smoke-extension/conf.yml <<'YAML'
info:
  name: Smoke extension
  identifier: smoke
  description: Deployment regression fixture
  version: 1.0.0
  target: beta-2026-08
admin:
  view: view.blade.php
dashboard:
  components: components
data:
  directory: data
YAML
printf '<p>Smoke extension</p>\n' > /tmp/panel-smoke-extension/view.blade.php
printf 'seed\n' > /tmp/panel-smoke-extension/data/seed.txt
cat > /tmp/panel-smoke-extension/components/Components.yml <<'YAML'
Dashboard:
  Serverlist:
    ServerRow:
      AfterEntryName: AfterName
YAML
cp tests/Deployment/fixtures/AddonDependencies.tsx /tmp/panel-smoke-extension/components/AfterName.tsx
(cd /tmp/panel-smoke-extension && zip -qr /app/smoke.blueprint .)
bash blueprint.sh -bash -i smoke < /dev/null
pnpm run tsc
printf 'preserved-extension-data\n' > .blueprint/extensions/smoke/private/preserved.txt
ENV_BEFORE=$(sha256sum .env | cut -d ' ' -f 1)
tar -C /source --exclude='./.git' --exclude='./node_modules' --exclude='./vendor' \
    --exclude='./storage' --exclude='./bootstrap/cache/*.php' --exclude='./.env' \
    -czf /tmp/panel-smoke-release.tar.gz .
CHECKSUM=$(sha256sum /tmp/panel-smoke-release.tar.gz | cut -d ' ' -f 1)
bash scripts/panel-update.sh --archive /tmp/panel-smoke-release.tar.gz "$CHECKSUM"
test "$(sha256sum .env | cut -d ' ' -f 1)" = "$ENV_BEFORE"
grep -Fq preserved-extension-data .blueprint/extensions/smoke/private/preserved.txt
grep -Fq SmokeComponent resources/scripts/blueprint/components/Dashboard/Serverlist/ServerRow/AfterEntryName.tsx
test "$(bash blueprint.sh -bash -version)" = beta-2026-08
test ! -f storage/framework/down
test -s "$(find /var/backups/aquadactyl -mindepth 2 -name database.sql -print -quit)"
printf '%s\n' 'Update smoke checks passed: verified archive, backup, environment, extension data, hook reapplication and Blueprint version.'
