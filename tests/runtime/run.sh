#!/usr/bin/env bash
set -Eeuo pipefail

# This runner owns an isolated workspace and database; never use panel volumes.
[[ ${APP_ENV:-} == testing && ${DB_HOST:-} == database && ${DB_DATABASE:-} == testing ]]
cd /app
rsync -a --delete \
  --exclude=node_modules --exclude=vendor --exclude=.git --exclude='.env*' \
  --exclude=bootstrap/cache --exclude=storage --exclude=public/build --exclude=public/hot \
  --exclude='coverage*' /source/ /app/
cp /source/.env.ci .env
mkdir -p bootstrap/cache storage/logs storage/framework/{cache/data,sessions,views} public/build
printf '%s\n' '{"resources/scripts/index.tsx":{"file":"assets/test.js","src":"resources/scripts/index.tsx","isEntry":true}}' > public/build/manifest.json
composer install --no-interaction --no-progress --prefer-dist
exec php -d zend.assertions=1 -d pcov.enabled=1 -d pcov.directory=/app/app vendor/bin/pest "$@"
