<?php

use Pterodactyl\Models\Nest;
use Pterodactyl\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Pterodactyl\Services\Users\UserCreationService;

// This bootstrap is opt-in and used only by the local testing Compose stack.
if (getenv('AQUADACTYL_LOCAL_SETUP') !== 'true') {
    exit(0);
}

require __DIR__ . '/../../vendor/autoload.php';

$app = require __DIR__ . '/../../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

// Leave edited eggs intact when restarting or rebuilding the test instance.
if (!Nest::query()->exists()) {
    $status = $kernel->call('db:seed', ['--class' => 'DatabaseSeeder', '--force' => true]);
    echo $kernel->output();
    if ($status !== 0) {
        exit($status);
    }
}

// Never reset a password or promote an existing account on subsequent boots.
if (User::query()->exists()) {
    echo "Local accounts already exist; leaving them unchanged.\n";
    exit(0);
}

$email = getenv('AQUADACTYL_ADMIN_EMAIL');
$username = getenv('AQUADACTYL_ADMIN_USERNAME');
$password = getenv('AQUADACTYL_ADMIN_PASSWORD');

if (!$email || !$username || !$password) {
    fwrite(STDERR, "Local setup requires AQUADACTYL_ADMIN_EMAIL, AQUADACTYL_ADMIN_USERNAME and AQUADACTYL_ADMIN_PASSWORD.\n");
    exit(1);
}

$app->make(UserCreationService::class)->handle([
    'email' => $email,
    'username' => $username,
    'password' => $password,
    'name_first' => 'Aquadactyl',
    'name_last' => 'Admin',
    'root_admin' => true,
]);

echo "Local administrator created: {$email}\n";
