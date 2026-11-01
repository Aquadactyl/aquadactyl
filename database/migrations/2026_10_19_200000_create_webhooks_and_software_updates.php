<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('webhook_endpoints', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('format', 20);
            $table->text('url');
            $table->text('signing_secret')->nullable();
            $table->json('events');
            $table->boolean('enabled')->default(false);
            $table->unsignedInteger('revision')->default(1);
            $table->timestamps();
        });
        Schema::create('webhook_deliveries', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('webhook_endpoint_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('endpoint_revision');
            $table->uuid('event_id');
            $table->string('event_type', 100);
            $table->json('payload');
            $table->string('status', 20)->default('pending');
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('next_attempt_at')->nullable()->index();
            $table->timestamp('delivered_at')->nullable();
            $table->unsignedSmallInteger('last_status')->nullable();
            $table->string('last_error')->nullable();
            $table->timestamps();
            $table->unique(['webhook_endpoint_id', 'endpoint_revision', 'event_id'], 'webhook_delivery_event_unique');
            $table->index(['status', 'updated_at']);
        });
        Schema::create('software_updates', function (Blueprint $table) {
            $table->id();
            $table->string('component', 80)->unique();
            $table->unsignedInteger('node_id')->nullable();
            $table->foreign('node_id')->references('id')->on('nodes')->cascadeOnDelete();
            $table->string('product', 20);
            $table->string('installed_version', 120);
            $table->string('latest_version', 120)->nullable();
            $table->string('release_url')->nullable();
            $table->text('release_notes')->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->string('last_error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('software_updates');
        Schema::dropIfExists('webhook_deliveries');
        Schema::dropIfExists('webhook_endpoints');
    }
};
