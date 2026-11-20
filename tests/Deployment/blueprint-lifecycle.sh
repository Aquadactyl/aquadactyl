#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run this isolated lifecycle fixture as root.' >&2; exit 1; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
WORK=$(mktemp -d)
trap 'rm -rf -- "$WORK"' EXIT
chmod 0755 "$WORK"
FOLDER="$WORK/panel with spaces"
WEBUSER=nobody
USERSHELL=/bin/bash
web_group=$(id -gn "$WEBUSER")
OWNERSHIP="root:$web_group"
BLUEPRINT__DEBUG="$WORK/debug.log"
mkdir -p "$FOLDER/.blueprint/extensions/fixture/private" "$FOLDER/routes" "$FOLDER/storage" \
  "$FOLDER/bootstrap/cache" "$FOLDER/node_modules/.bin" "$FOLDER/vendor/bin" "$FOLDER/scripts"
chown -R "root:$web_group" "$FOLDER"
chmod -R 0750 "$FOLDER"
chown "$WEBUSER:$web_group" "$FOLDER/storage"
printf 'original route\n' > "$FOLDER/routes/api-client.php"
chown "root:$web_group" "$FOLDER/routes/api-client.php"
chmod 0640 "$FOLDER/routes/api-client.php"
touch "$FOLDER/.env" "$FOLDER/blueprint.sh"
PRINT() { printf '%s\n' "$*"; }
source "$ROOT/scripts/helpers/extension-lifecycle.sh"
# The runner's checkout may be inside a private home directory. Give the
# unprivileged fixture its own readable copy, not access to that checkout.
cp "$ROOT/scripts/helpers/extension-lifecycle.sh" "$WORK/extension-lifecycle.sh"
chmod 0644 "$WORK/extension-lifecycle.sh"
# Test that publisher metadata stays literal.
# shellcheck disable=SC2016
target='literal $(touch SHOULD_NOT_EXIST) "quotes"'
version='0.5.2; not a command'

# A failed write used to be hidden by a successful final cache-clear command.
cat > "$FOLDER/.blueprint/extensions/fixture/private/install.sh" <<'SH'
printf 'patched route\n' > "$PTERODACTYL_DIRECTORY/routes/api-client.php"
touch "$PTERODACTYL_DIRECTORY/storage/finished"
SH
chmod 0640 "$FOLDER/.blueprint/extensions/fixture/private/install.sh"
chown "root:$web_group" "$FOLDER/.blueprint/extensions/fixture/private/install.sh"
status=0
blueprint_extension_run_script fixture install > "$WORK/default.log" 2>&1 || status=$?
[[ $status != 0 && ! -e "$FOLDER/storage/finished" ]]
grep -q '^original route$' "$FOLDER/routes/api-client.php"
grep -q 'operation was not completed' "$WORK/default.log"
grep -q BLUEPRINT__ALLOW_CORE_SCRIPTS "$WORK/default.log"

# Explicit operator consent permits a reviewed legacy core patch. Permissions
# stay root-owned; the option does not make PHP able to edit source afterwards.
BLUEPRINT__ALLOW_CORE_SCRIPTS=1 blueprint_extension_run_script fixture install > "$WORK/root.log" 2>&1
grep -q '^patched route$' "$FOLDER/routes/api-client.php"
[[ -f "$FOLDER/storage/finished" ]]
blueprint_extension_permissions > /dev/null
[[ $(stat -c %U "$FOLDER/routes/api-client.php") == root && $(stat -c %a "$FOLDER/routes/api-client.php") == 640 ]]
if su "$WEBUSER" -s /bin/bash -c "printf forbidden > '$FOLDER/routes/api-client.php'" 2>/dev/null; then exit 1; fi

# Default scripts retain the web identity and receive metadata literally.
cat > "$FOLDER/.blueprint/extensions/fixture/private/install.sh" <<'SH'
id -u > "$PTERODACTYL_DIRECTORY/storage/uid"
printf '%s\n' "$EXTENSION_TARGET" "$EXTENSION_VERSION" "$EXTENSION_IDENTIFIER" "$BLUEPRINT_DEVELOPER" > "$PTERODACTYL_DIRECTORY/storage/env"
SH
chown "root:$web_group" "$FOLDER/.blueprint/extensions/fixture/private/install.sh"
chmod 0640 "$FOLDER/.blueprint/extensions/fixture/private/install.sh"
blueprint_extension_run_script fixture install
[[ $(cat "$FOLDER/storage/uid") == "$(id -u "$WEBUSER")" ]]
[[ $(sed -n 1p "$FOLDER/storage/env") == "$target" && $(sed -n 2p "$FOLDER/storage/env") == "$version" ]]
[[ $(sed -n 3p "$FOLDER/storage/env") == fixture && $(sed -n 4p "$FOLDER/storage/env") == false ]]
[[ ! -e "$FOLDER/SHOULD_NOT_EXIST" ]]

# Retain the existing install escalation flag, but removal needs its own
# explicit operator opt-in. Failures and pipelines stop before later commands.
blueprint_extension_run_script fixture install true > /dev/null
[[ $(cat "$FOLDER/storage/uid") == 0 ]]
for action in install remove; do
  # Expand only when the fixture script executes.
  # shellcheck disable=SC2016
  printf 'false | true\ntouch "$PTERODACTYL_DIRECTORY/storage/after-failure"\n' > "$FOLDER/.blueprint/extensions/fixture/private/$action.sh"
  chown "root:$web_group" "$FOLDER/.blueprint/extensions/fixture/private/$action.sh"
  chmod 0640 "$FOLDER/.blueprint/extensions/fixture/private/$action.sh"
  status=0
  blueprint_extension_run_script fixture "$action" > /dev/null 2>&1 || status=$?
  [[ $status != 0 && ! -e "$FOLDER/storage/after-failure" ]]
  printf 'exit 17\n' > "$FOLDER/.blueprint/extensions/fixture/private/$action.sh"
  status=0
  BLUEPRINT__ALLOW_CORE_SCRIPTS=1 blueprint_extension_run_script fixture "$action" > /dev/null 2>&1 || status=$?
  [[ $status == 17 ]]
done
blueprint_extension_run_script fixture absent

cat > "$WORK/nonroot.sh" <<'SH'
source "$LIFECYCLE_SOURCE"
PRINT() { printf '%s\n' "$*"; }
FOLDER="$LIFECYCLE_PANEL"
BLUEPRINT__ALLOW_CORE_SCRIPTS=1 blueprint_extension_run_script fixture install
SH
status=0
su "$WEBUSER" -s /bin/bash -c "LIFECYCLE_SOURCE='$WORK/extension-lifecycle.sh' LIFECYCLE_PANEL='$FOLDER' bash '$WORK/nonroot.sh'" > "$WORK/nonroot.log" 2>&1 || status=$?
[[ $status != 0 ]]
grep -q 'requires root' "$WORK/nonroot.log"

echo 'Blueprint lifecycle passed: failed writes/pipelines stop, root consent is explicit, identities and metadata are preserved, and source stays protected.'
