#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname -- "$0")/deploy/common.sh"

if [[ ${1:-} == --help || $# -eq 0 ]]; then
    printf '%s\n' 'Usage: sudo bash scripts/panel-update.sh <release-tag> [owner/repository]' \
        '       sudo bash scripts/panel-update.sh --archive /path/panel.tar.gz <sha256>'
    exit 0
fi
preflight
WORK=$(mktemp -d)
BACKUP=''
MAINTENANCE=false
cleanup() {
    local status=$?
    rm -rf -- "$WORK"
    if [[ $status -ne 0 && $MAINTENANCE == true ]]; then
        printf 'Update failed; maintenance remains enabled. Backup: %s\nSee docs/DEPLOYMENT.md for recovery.\n' "$BACKUP" >&2
    fi
    exit "$status"
}
trap cleanup EXIT

if [[ $1 == --archive ]]; then
    [[ $# -eq 3 && -f $2 ]] || fail 'Provide an archive and its SHA256 digest.'
    cp -- "$2" "$WORK/panel.tar.gz"
    EXPECTED=$3
else
    [[ $# -le 2 && $1 =~ ^v[0-9][a-zA-Z0-9._-]*$ ]] || fail 'Specify an explicit release tag beginning with v.'
    REPOSITORY=${2:-Aquadactyl/aquadactyl}
    [[ "$REPOSITORY" =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]] || fail 'Invalid GitHub repository.'
    URL="https://github.com/$REPOSITORY/releases/download/$1"
    curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' "$URL/panel.tar.gz" -o "$WORK/panel.tar.gz"
    curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' "$URL/SHA256SUMS" -o "$WORK/SHA256SUMS"
    EXPECTED=$(awk '$2 == "panel.tar.gz" { print $1 }' "$WORK/SHA256SUMS")
fi
[[ "$EXPECTED" =~ ^[a-fA-F0-9]{64}$ ]] || fail 'Missing or invalid archive checksum.'
printf '%s  %s\n' "$EXPECTED" "$WORK/panel.tar.gz" | sha256sum --check --status || fail 'Archive checksum mismatch.'

# Reject paths that escape the staging directory, secrets and archive links before extracting.
tar -tzf "$WORK/panel.tar.gz" > "$WORK/files"
while IFS= read -r path; do
    [[ "$path" != /* && "/$path/" != *'/../'* && "$path" != .env && "$path" != ./.env ]] || fail 'Unsafe path in release archive.'
done < "$WORK/files"
tar -tvzf "$WORK/panel.tar.gz" | awk 'substr($0,1,1) != "-" && substr($0,1,1) != "d" { exit 1 }' || fail 'Release archives may only contain regular files and directories.'
mkdir "$WORK/release"
tar -xzf "$WORK/panel.tar.gz" --no-same-owner --no-same-permissions -C "$WORK/release"
for required in artisan package.json composer.lock pnpm-lock.yaml pnpm-workspace.yaml deploy/blueprint-release.json scripts/panel-install.sh .blueprint/extensions/blueprint/private/extensionfs.php; do
    [[ -f "$WORK/release/$required" ]] || fail "Incomplete fork release: $required is missing."
done

command -v mariadb-dump >/dev/null || command -v mysqldump >/dev/null || fail 'Install mariadb-client or a MySQL dump client before updating.'

# Reapply extensions from their original packages after replacing injected core files.
EXTENSIONS=()
if [[ -f .blueprint/extensions/blueprint/private/db/installed_extensions ]]; then
    IFS=',' read -ra entries < .blueprint/extensions/blueprint/private/db/installed_extensions || true
    for entry in "${entries[@]}"; do
        extension=${entry#|}
        [[ -z "$extension" ]] && continue
        [[ "$extension" =~ ^[a-z]{1,48}$ && -f "$PANEL_ROOT/$extension.blueprint" ]] || fail "Keep $extension.blueprint in the panel directory before updating."
        EXTENSIONS+=("$extension")
    done
fi

BACKUP_BASE=${BACKUP_DIR:-/var/backups/aquadactyl}
mkdir -p -- "$BACKUP_BASE"
BACKUP_BASE=$(realpath -- "$BACKUP_BASE")
[[ "$BACKUP_BASE/" != "$PANEL_ROOT/"* ]] || fail 'Backups must be outside the panel directory.'
BACKUP=$(mktemp -d "$BACKUP_BASE/$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
chmod 0700 "$BACKUP"
[[ ! -f storage/framework/down ]] || fail 'Panel is already in maintenance mode; resolve the previous deployment first.'
permissions
artisan down --retry=60
MAINTENANCE=true
# Pause background writes before taking the database snapshot.
if command -v systemctl >/dev/null; then systemctl stop pteroq.service; fi
php artisan p:maintenance:backup-database "$BACKUP/database.sql"
tar --exclude='./node_modules' --exclude='./.git' -czf "$BACKUP/panel.tar.gz" -C "$PANEL_ROOT" .
chmod 0600 "$BACKUP/"*

# Preserve environment, uploaded files, extension state and custom extension sources.
rsync -a --no-owner --no-group \
    --exclude=.env --exclude=.blueprintrc --exclude=storage/ --exclude=bootstrap/cache/ \
    --exclude=.blueprint/dev/ --exclude=.blueprint/tmp/ \
    --exclude=.blueprint/extensions/blueprint/private/db/ \
    --exclude=.blueprint/extensions/blueprint/private/debug/ \
    "$WORK/release/" "$PANEL_ROOT/"
dependencies
artisan migrate --force
artisan db:seed --class=BlueprintSeeder --force
initialize_blueprint
for extension in "${EXTENSIONS[@]}"; do
    bash blueprint.sh -bash -i "$extension"
done
pnpm run build:production
finish_deployment
if command -v systemctl >/dev/null; then systemctl start pteroq.service; fi
artisan up
MAINTENANCE=false
printf 'Update complete. Backup: %s\n' "$BACKUP"
