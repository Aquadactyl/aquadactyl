<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('account_notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id')->unique();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->json('site_events');
            $table->json('discord_events');
            $table->text('discord_webhook')->nullable();
            $table->unsignedInteger('revision')->default(1);
            $table->timestamps();
        });
        Schema::create('account_notifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('server_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('server_id')->references('id')->on('servers')->cascadeOnDelete();
            $table->string('event', 64);
            $table->string('event_id', 100);
            $table->string('server_name');
            $table->string('detail')->nullable();
            $table->boolean('site')->default(true);
            $table->timestamp('read_at')->nullable();
            $table->unsignedInteger('discord_revision')->nullable();
            $table->string('discord_status', 20)->default('not_requested');
            $table->unsignedTinyInteger('discord_attempts')->default(0);
            $table->timestamp('discord_next_attempt_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'event_id']);
            $table->index(['user_id', 'site', 'read_at', 'id'], 'account_notification_inbox');
            $table->index(['discord_status', 'discord_next_attempt_at'], 'account_notification_delivery');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_notifications');
        Schema::dropIfExists('account_notification_preferences');
    }
};
