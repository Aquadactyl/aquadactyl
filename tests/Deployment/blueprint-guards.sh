#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
WORK=$(mktemp -d)
trap 'rm -rf -- "$WORK"' EXIT
mkdir -p "$WORK/panel/scripts/helpers" "$WORK/panel/.blueprint"
cp "$ROOT/scripts/helpers/extension-lifecycle.sh" "$WORK/panel/scripts/helpers/"

cat > "$WORK/run.sh" <<'SH'
#!/usr/bin/env bash
FOLDER="$GUARD_PANEL"
BLUEPRINT__FOLDER="$FOLDER"
BLUEPRINT__DEBUG="$FOLDER/debug.log"
PRINT() { printf '%s\n' "$*"; }
hide_progress() { :; }
source "$GUARD_SOURCE/scripts/libraries/lock.sh"
case "$GUARD_CASE" in
  remove-build) source "$GUARD_SOURCE/scripts/commands/extensions/remove.sh" ;;
  *) source "$GUARD_SOURCE/scripts/commands/extensions/install.sh" ;;
esac
depend() { if [[ $GUARD_CASE == dependencies ]]; then exit 7; fi; }
pnpm() { return 13; }
php() { :; }
blueprint_extension_permissions() { :; }
blueprint_extension_artisan() { [[ $1 != view:cache ]]; }
blueprint_extension_reload_php() { touch "$FOLDER/reloaded"; }
InstallExtension() { InstalledExtensions=fixture; YARN=y; [[ $GUARD_CASE != cache ]] || YARN=n; return 0; }
RemoveExtension() { RemovedExtensions=fixture; YARN=y; return 0; }
cd "$FOLDER" || exit 1
Command fixture
SH

for scenario in dependencies install-build remove-build cache; do
  status=0
  GUARD_SOURCE="$ROOT" GUARD_PANEL="$WORK/panel" GUARD_CASE="$scenario" \
    bash "$WORK/run.sh" > "$WORK/output" 2>&1 || status=$?
  [[ $status != 0 && ! -e "$WORK/panel/.blueprint/lock" && ! -e "$WORK/panel/reloaded" ]]
  if grep -q SUCCESS "$WORK/output"; then cat "$WORK/output"; exit 1; fi
  case "$scenario" in
    dependencies) [[ $status == 7 ]] ;;
    *-build) grep -q 'frontend build failed' "$WORK/output" ;;
    cache) grep -q 'view:cache' "$WORK/output" ;;
  esac
done
echo 'Blueprint guards passed: dependency, install build, uninstall build and cache failures return errors and release locks.'
