<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('status_components', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('node_id')->unique();
            $table->foreign('node_id')->references('id')->on('nodes')->cascadeOnDelete();
            $table->string('name', 100);
            $table->timestamps();
        });
        Schema::create('status_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('status_component_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20);
            $table->timestamp('checked_at');
            $table->index(['status_component_id', 'checked_at']);
            $table->index('checked_at');
        });
        Schema::create('status_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('title', 160);
            $table->text('message');
            $table->string('status', 20);
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
        Schema::create('discord_role_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('role_id', 20);
            // Preserve a deleted filter as a disabled rule, never widen it to all servers.
            $table->unsignedInteger('egg_id')->nullable();
            $table->unsignedInteger('node_id')->nullable();
            $table->unsignedInteger('minimum_servers')->default(1);
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });
        Schema::create('discord_role_grants', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->string('discord_id', 20);
            $table->string('guild_id', 20);
            $table->string('role_id', 20);
            $table->timestamps();
            $table->unique(['discord_id', 'guild_id', 'role_id'], 'discord_role_grant_unique');
        });
        Schema::create('discord_role_syncs', function (Blueprint $table) {
            $table->id();
            $table->string('discord_id', 20)->unique();
            $table->timestamp('last_synced_at')->nullable();
            $table->string('last_error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['discord_role_syncs', 'discord_role_grants', 'discord_role_rules', 'status_incidents', 'status_checks', 'status_components'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
