#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run this isolated permissions fixture as root.' >&2; exit 1; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
WORK=$(mktemp -d)
trap 'rm -rf -- "$WORK"' EXIT
chmod 0755 "$WORK"
FOLDER="$WORK/panel"
WEBUSER=nobody
web_group=$(id -gn "$WEBUSER")
OWNERSHIP="root:$web_group"
BLUEPRINT__DEBUG="$WORK/permissions.log"
mkdir -p "$FOLDER/node_modules/.bin" "$FOLDER/vendor/bin" "$FOLDER/scripts" \
  "$FOLDER/.blueprint/extensions/fixture/fs" "$FOLDER/.blueprint/extensions/linked" "$WORK/outside"
touch "$FOLDER/.env" "$FOLDER/blueprint.sh" "$FOLDER/.blueprint/extensions/fixture/Controller.php" \
  "$FOLDER/.blueprint/extensions/fixture/fs/data.txt" "$WORK/outside/untouched.txt"
chmod 0600 "$WORK/outside/untouched.txt"
ln -s "$WORK/outside" "$FOLDER/.blueprint/extensions/linked/fs"
ln -s "$WORK/outside" "$FOLDER/.blueprint/extensions/fixture/fs/linked"
PRINT() { :; }
source "$ROOT/scripts/helpers/extension-lifecycle.sh"
blueprint_extension_permissions
[[ $(stat -c %U "$FOLDER/.env") == root && $(stat -c %a "$FOLDER/.env") == 640 ]]
[[ $(stat -c %U "$FOLDER/.blueprint/extensions/fixture/Controller.php") == root ]]
[[ $(stat -c %U "$FOLDER/.blueprint/extensions/fixture/fs/data.txt") == "$WEBUSER" ]]
[[ $(stat -c %a "$FOLDER/.blueprint/extensions/fixture/fs/data.txt") == 640 ]]
[[ $(stat -c %a "$FOLDER/.blueprint/extensions/fixture/fs") == 750 ]]
[[ $(stat -c %U "$WORK/outside/untouched.txt") == root && $(stat -c %a "$WORK/outside/untouched.txt") == 600 ]]
su "$WEBUSER" -s /bin/bash -c "touch '$FOLDER/.blueprint/extensions/fixture/fs/writable.txt'"
if su "$WEBUSER" -s /bin/bash -c "touch '$FOLDER/.blueprint/extensions/fixture/forbidden.php'" 2>/dev/null; then
  echo 'Addon source must remain read-only to PHP.' >&2
  exit 1
fi
echo 'Blueprint permissions passed: ExtensionFS writable; addon source, environment and symlink targets protected.'
