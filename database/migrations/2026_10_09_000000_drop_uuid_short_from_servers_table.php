<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('servers', 'uuidShort')) {
            Schema::table('servers', function (Blueprint $table) {
                $table->dropColumn('uuidShort');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->char('uuidShort', 8)->nullable()->unique();
        });
    }
};
