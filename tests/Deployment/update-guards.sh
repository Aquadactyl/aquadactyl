#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || exec sudo bash "$0"
ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
WORK=$(mktemp -d)
trap 'rm -rf -- "$WORK"' EXIT
mkdir -p "$WORK/panel/scripts/deploy" "$WORK/bin" "$WORK/payload"
cp "$ROOT/scripts/panel-update.sh" "$WORK/panel/scripts/"
cp "$ROOT/scripts/deploy/common.sh" "$WORK/panel/scripts/deploy/"
touch "$WORK/panel/artisan" "$WORK/panel/composer.lock"
cp "$ROOT/package.json" "$WORK/panel/"
printf 'APP_KEY=preserved-test-value\n' > "$WORK/panel/.env"
for command in php composer node pnpm git curl zip unzip rsync runuser; do
    printf '#!/bin/bash\nexit 0\n' > "$WORK/bin/$command"
done
printf '#!/bin/bash\necho 12.10.1\n' > "$WORK/bin/pnpm"
printf '#!/bin/bash\necho 12.10.1\n' > "$WORK/bin/node"
printf '#!/bin/bash\ntouch "%s/mutated"\nexit 99\n' "$WORK" > "$WORK/bin/runuser"
chmod +x "$WORK/bin/"*
export PATH="$WORK/bin:$PATH" WEB_USER=root WEB_GROUP=root

expect_failure() {
    local archive=$1 expected=$2 digest=${3:-}
    [[ -n "$digest" ]] || digest=$(sha256sum "$archive" | cut -d ' ' -f 1)
    if bash "$WORK/panel/scripts/panel-update.sh" --archive "$archive" "$digest" > "$WORK/output" 2>&1; then
        printf 'Unexpected success: %s\n' "$expected" >&2; exit 1
    fi
    grep -Fq "$expected" "$WORK/output" || { cat "$WORK/output"; exit 1; }
    [[ ! -e "$WORK/mutated" ]]
    grep -Fq 'APP_KEY=preserved-test-value' "$WORK/panel/.env"
}

touch "$WORK/payload/artisan"
tar -czf "$WORK/normal.tar.gz" -C "$WORK/payload" artisan
printf '#!/bin/bash\nexit 1\n' > "$WORK/bin/php"
expect_failure "$WORK/normal.tar.gz" 'PHP 8.4 or 8.5 is required'
printf '#!/bin/bash\nexit 0\n' > "$WORK/bin/php"
printf '#!/bin/bash\nexit 1\n' > "$WORK/bin/node"
expect_failure "$WORK/normal.tar.gz" 'Node.js 22.13 or later is required'
printf '#!/bin/bash\necho 12.10.1\n' > "$WORK/bin/node"
printf '#!/bin/bash\necho 10.22.0\n' > "$WORK/bin/pnpm"
expect_failure "$WORK/normal.tar.gz" 'Install the pinned pnpm version'
printf '#!/bin/bash\necho 12.10.1\n' > "$WORK/bin/pnpm"
expect_failure "$WORK/normal.tar.gz" 'Archive checksum mismatch' "$(printf '%064d' 0)"
expect_failure "$WORK/normal.tar.gz" 'Incomplete fork release'
tar -czf "$WORK/traversal.tar.gz" --transform='s|artisan|../escape|' -C "$WORK/payload" artisan
expect_failure "$WORK/traversal.tar.gz" 'Unsafe path in release archive'
ln -s /tmp/escape "$WORK/payload/link"
tar -czf "$WORK/link.tar.gz" -C "$WORK/payload" link
expect_failure "$WORK/link.tar.gz" 'Release archives may only contain regular files and directories'
touch "$WORK/payload/.env"
tar -czf "$WORK/secrets.tar.gz" -C "$WORK/payload" .env
expect_failure "$WORK/secrets.tar.gz" 'Unsafe path in release archive'
printf '%s\n' 'Update guards passed: runtime versions, checksum, incomplete release, traversal, symlink and secret rejection.'
