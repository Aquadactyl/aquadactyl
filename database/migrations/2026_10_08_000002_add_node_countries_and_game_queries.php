<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    public function up(): void
    {
        Schema::table('nodes', function (Blueprint $table) {
            $table->char('country_code', 2)->nullable();
            $table->string('query_address', 253)->nullable();
        });
        Schema::table('servers', function (Blueprint $table) {
            $table->string('game_query_type', 40)->default('auto');
            $table->unsignedInteger('game_query_allocation_id')->nullable();
            $table->foreign('game_query_allocation_id')->references('id')->on('allocations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->dropForeign(['game_query_allocation_id']);
            $table->dropColumn(['game_query_type', 'game_query_allocation_id']);
        });
        Schema::table('nodes', function (Blueprint $table) {
            $table->dropColumn(['country_code', 'query_address']);
        });
    }
};
