<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        // Change the default for new nodes while preserving existing limits.
        Schema::table('nodes', function (Blueprint $table) {
            $table->unsignedInteger('upload_size')->default(2048)->change();
        });
    }

    public function down(): void
    {
        Schema::table('nodes', function (Blueprint $table) {
            $table->unsignedInteger('upload_size')->default(100)->change();
        });
    }
};
