#!/usr/bin/env bash
set -Eeuo pipefail

# Run only against a disposable Docker panel and database.
[[ ${DB_DATABASE:-} == blueprint_cli_smoke ]] || {
  echo 'This fixture requires an isolated database named blueprint_cli_smoke.' >&2
  exit 1
}
cd /app
command -v blueprint >/dev/null
[[ $(blueprint -version) == beta-2026-08 ]]
[[ ! -d .blueprint/extensions/clismoke ]]

WORK=$(mktemp -d)
trap 'rm -rf -- "$WORK"' EXIT
mkdir -p "$WORK/components" "$WORK/data" "$WORK/migrations"
cat > "$WORK/conf.yml" <<'YAML'
info:
  name: CLI smoke theme
  identifier: clismoke
  description: Isolated Blueprint CLI regression fixture
  version: 1.0.0
  target: beta-2026-08
admin:
  view: view.blade.php
dashboard:
  components: components
data:
  directory: data
database:
  migrations: migrations
YAML
printf '<p>Blueprint CLI fixture</p>\n' > "$WORK/view.blade.php"
printf 'fixture data\n' > "$WORK/data/seed.txt"
cat > "$WORK/components/Components.yml" <<'YAML'
Dashboard:
  Serverlist:
    ServerRow:
      AfterEntryName: AfterName
YAML
cat > "$WORK/components/AfterName.tsx" <<'TSX'
import React from 'react';
export default function AfterName() {
    return <span>blueprint-cli-fixture-v1</span>;
}
TSX
cat > "$WORK/migrations/2026_10_09_000000_create_blueprint_cli_smoke_table.php" <<'PHP'
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('blueprint_cli_smoke', function (Blueprint $table) { $table->id(); });
    }
    public function down(): void { Schema::dropIfExists('blueprint_cli_smoke'); }
};
PHP

package() { (cd "$WORK" && zip -qr /app/clismoke.blueprint .); }
assert_ready() {
  [[ ! -e .blueprint/lock ]]
  [[ -f public/build/manifest.json && -f bootstrap/cache/config.php ]]
  [[ -f bootstrap/cache/routes-v7.php ]]
  [[ $(stat -c %U bootstrap/cache/config.php) == nginx ]]
  [[ $(stat -c %a bootstrap/cache/config.php) == 640 ]]
  [[ $(stat -c %U storage/framework/views) == nginx ]]
  [[ $(stat -Lc %a .env) == 640 ]]
  supervisorctl -c /etc/supervisord.conf status php-fpm | grep -q RUNNING
  curl --fail --silent --output /dev/null http://127.0.0.1/auth/login
}

package
blueprint -i clismoke </dev/null
assert_ready
grep -Fq '|clismoke,' .blueprint/extensions/blueprint/private/db/installed_extensions
grep -RFq blueprint-cli-fixture-v1 public/build/assets
php artisan migrate:status --no-ansi | grep -F create_blueprint_cli_smoke_table | grep -q Ran
printf 'preserved private data\n' > .blueprint/extensions/clismoke/private/preserved.txt

sed -i 's/1.0.0/2.0.0/' "$WORK/conf.yml"
sed -i 's/fixture-v1/fixture-v2/' "$WORK/components/AfterName.tsx"
package
blueprint -i clismoke.blueprint </dev/null
assert_ready
grep -Fq 'preserved private data' .blueprint/extensions/clismoke/private/preserved.txt
grep -RFq blueprint-cli-fixture-v2 public/build/assets
if grep -RFq blueprint-cli-fixture-v1 public/build/assets; then
  echo 'The previous addon bundle is still present.' >&2; exit 1
fi

blueprint -r clismoke --yes </dev/null
assert_ready
[[ ! -d .blueprint/extensions/clismoke && ! -L public/extensions/clismoke ]]
[[ -f clismoke.blueprint ]]
if grep -Fq '|clismoke,' .blueprint/extensions/blueprint/private/db/installed_extensions \
  || grep -RFq blueprint-cli-fixture-v2 public/build/assets; then
  echo 'The removed addon is still active.' >&2; exit 1
fi
php artisan migrate:status --no-ansi | grep -F create_blueprint_cli_smoke_table | grep -q Ran
echo 'Blueprint CLI smoke passed: install, update, preserved data, Docker migration, build, caches, permissions, PHP reload and uninstall.'
