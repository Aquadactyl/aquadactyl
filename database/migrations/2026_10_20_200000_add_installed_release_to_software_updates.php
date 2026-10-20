<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('software_updates', function (Blueprint $table) {
            $table->json('installed_release')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('software_updates', function (Blueprint $table) {
            $table->dropColumn('installed_release');
        });
    }
};
