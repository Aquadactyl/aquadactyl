<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        // Upgrades remain usable immediately; only empty installations are prompted.
        DB::table('settings')->insertOrIgnore([
            'key' => 'settings::aquadactyl:setup:completed',
            'value' => DB::table('users')->exists() || DB::table('nodes')->exists() ? 'true' : 'false',
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'settings::aquadactyl:setup:completed')->delete();
    }
};
