<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('subdomain_domains', function (Blueprint $table) {
            $table->id();
            $table->string('domain')->unique();
            $table->string('zone_id', 32);
            $table->text('api_token');
            $table->string('target_ip', 45)->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });
        Schema::create('server_subdomains', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Retain DNS ownership after a server is deleted so the reconciler can clean up.
            $table->unsignedInteger('server_id')->nullable()->unique();
            $table->foreign('server_id')->references('id')->on('servers')->nullOnDelete();
            $table->foreignId('domain_id')->constrained('subdomain_domains')->restrictOnDelete();
            $table->string('label', 63);
            $table->boolean('minecraft_srv')->default(false);
            $table->string('status', 20)->default('pending')->index();
            $table->json('records')->nullable();
            $table->string('synced_target')->nullable();
            $table->timestamps();
            $table->unique(['domain_id', 'label']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_subdomains');
        Schema::dropIfExists('subdomain_domains');
    }
};
