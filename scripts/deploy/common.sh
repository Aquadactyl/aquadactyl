#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

fail() { printf '%s\n' "$*" >&2; exit 1; }
PANEL_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
WEB_USER=${WEB_USER:-www-data}
WEB_GROUP=${WEB_GROUP:-www-data}
PHP_FPM_SERVICE=${PHP_FPM_SERVICE:-php8.5-fpm}
export TERM=${TERM:-dumb}

preflight() {
    [[ $EUID -eq 0 ]] || fail 'Run this deployment command with sudo.'
    [[ "$PANEL_ROOT" != / && -f "$PANEL_ROOT/artisan" && -f "$PANEL_ROOT/composer.lock" ]] || fail 'Invalid panel directory.'
    [[ -f "$PANEL_ROOT/.env" ]] || fail 'Configure .env before installing or updating.'
    id "$WEB_USER" >/dev/null
    for command in php composer node pnpm git curl zip unzip rsync flock runuser sha256sum grep sed awk tput tar; do
        command -v "$command" >/dev/null || fail "Missing dependency: $command"
    done
    php -r 'exit(PHP_VERSION_ID >= 80400 && PHP_VERSION_ID < 80600 ? 0 : 1);' || fail 'PHP 8.4 or 8.5 is required.'
    node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)' || fail 'Node.js 22.13 or later is required.'
    local expected_pnpm
    expected_pnpm=$(node -p 'require(process.argv[1]).packageManager.split("@")[1]' "$PANEL_ROOT/package.json")
    [[ $(pnpm --version) == "$expected_pnpm" ]] || fail "Install the pinned pnpm version: npm install --global pnpm@$expected_pnpm"
    [[ "$WEB_USER" =~ ^[a-z_][a-z0-9_-]*$ && "$WEB_GROUP" =~ ^[a-z_][a-z0-9_-]*$ ]] || fail 'Invalid web user or group.'
    # The Blueprint CLI interpolates its root path into generated shell commands.
    [[ "$PANEL_ROOT" =~ ^/[a-zA-Z0-9_./-]+$ ]] || fail 'Use a panel path without spaces or shell metacharacters.'
    exec 9>"$PANEL_ROOT/.panel-deploy.lock"
    flock -n 9 || fail 'Another deployment is running.'
    cd -- "$PANEL_ROOT"
}

artisan() { runuser -u "$WEB_USER" -- php "$PANEL_ROOT/artisan" "$@"; }

permissions() {
    chown -R root:"$WEB_GROUP" "$PANEL_ROOT"
    find "$PANEL_ROOT" -path "$PANEL_ROOT/node_modules" -prune -o -type d -exec chmod 0750 {} +
    find "$PANEL_ROOT" -path "$PANEL_ROOT/node_modules" -prune -o -type f -exec chmod 0640 {} +
    # Restore the executable bits on tools used by dependency and extension commands.
    find scripts -type f -name '*.sh' -exec chmod 0750 {} +
    chmod 0750 blueprint.sh
    find vendor/bin node_modules/.bin -type f -exec chmod 0750 {} + 2>/dev/null || true
    mkdir -p storage/framework/{cache/data,sessions,views} storage/logs bootstrap/cache
    chown -R "$WEB_USER:$WEB_GROUP" storage bootstrap/cache
    find storage bootstrap/cache -type d -exec chmod 0750 {} +
    find storage bootstrap/cache -type f -exec chmod 0640 {} +
    chmod 0640 .env
}

dependencies() {
    # Use the committed locks. Explicitly run Laravel discovery after installing.
    # Cached manifests from a development checkout may reference dev-only providers.
    rm -f bootstrap/cache/{config,packages,services,events,routes-v7}.php
    COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts --optimize-autoloader
    composer check-platform-reqs --no-dev
    pnpm install --frozen-lockfile
    permissions
    artisan package:discover --ansi
}

initialize_blueprint() {
    # Initialize links and placeholders without upstream prompts, dependency updates,
    # broad ownership changes or automatic removal of maintenance mode.
    if [[ -f .blueprint/extensions/blueprint/private/db/is_installed ]]; then
        rm .blueprint/extensions/blueprint/private/db/is_installed
    fi
    rm -f .blueprint/extensions/blueprint/private/db/version
    [[ -f .blueprintrc ]] || printf 'WEBUSER="%s"\nOWNERSHIP="root:%s"\nUSERSHELL="/bin/bash"\n' "$WEB_USER" "$WEB_GROUP" > .blueprintrc
    BLUEPRINT_ENVIRONMENT=ci bash blueprint.sh
    [[ -f .blueprint/extensions/blueprint/private/db/is_installed ]] || fail 'Blueprint initialization failed.'
    permissions
    artisan bp:cache
}

finish_deployment() {
    permissions
    artisan config:cache
    artisan route:cache
    artisan view:cache
    artisan queue:restart
    # A graceful reload drops stale OPcache entries while in-flight requests finish.
    if command -v systemctl >/dev/null; then
        systemctl reload "$PHP_FPM_SERVICE"
    fi
}
