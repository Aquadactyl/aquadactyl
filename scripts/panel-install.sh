#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname -- "$0")/deploy/common.sh"
preflight
[[ ! -f .blueprint/extensions/blueprint/private/db/is_installed ]] || fail 'Blueprint is already initialized. Use panel-update.sh.'
dependencies
artisan config:clear
artisan route:clear
# shellcheck disable=SC2016 # PHP variables must remain literal in this argument.
php -r '
    require "vendor/autoload.php";
    $app = require "bootstrap/app.php";
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $contents = str_replace("\r\n", "\n", file_get_contents(".env"));
    if (!config("app.key")) {
        $key = "base64:" . base64_encode(Illuminate\Encryption\Encrypter::generateKey(config("app.cipher")));
        $contents = preg_replace("/^APP_KEY=.*$/m", "APP_KEY=" . $key, $contents, 1, $count);
        if (!$count) $contents .= "\nAPP_KEY=" . $key . "\n";
    }
    if (!config("hashids.salt")) {
        $salt = bin2hex(random_bytes(16));
        $contents = preg_replace("/^HASHIDS_SALT=.*$/m", "HASHIDS_SALT=" . $salt, $contents, 1, $count);
        if (!$count) $contents .= "\nHASHIDS_SALT=" . $salt . "\n";
    }
    if (file_put_contents(".env", $contents) === false) exit(1);
'
artisan down --retry=60
trap 'rm -f .blueprint/extensions/blueprint/private/db/is_installed; printf "%s\n" "Installation failed; maintenance remains enabled. Resolve the error and rerun panel-install.sh." >&2' ERR
artisan migrate --force
artisan db:seed --class=BlueprintSeeder --force
initialize_blueprint
pnpm run build
finish_deployment
artisan up
printf '%s\n' 'Panel and bundled Blueprint are ready. Configure Nginx, TLS and the queue service using docs/DEPLOYMENT.md.'
