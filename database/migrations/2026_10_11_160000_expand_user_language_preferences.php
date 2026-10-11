<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('language', 35)->default('auto')->change();
        });
    }

    public function down(): void
    {
        // Keep existing regional preferences intact when rolling back. Only
        // the default changes; shrinking this column could lose user choices.
        Schema::table('users', function (Blueprint $table) {
            $table->string('language', 35)->default('en')->change();
        });
    }
};
