<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('account_passkeys', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('name', 100);
            $table->text('credential_id');
            $table->char('credential_id_hash', 64)->unique();
            $table->text('public_key');
            $table->unsignedBigInteger('signature_counter')->default(0);
            $table->json('transports')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('account_oauth_identities', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('provider', 16);
            $table->text('issuer');
            $table->string('subject', 255);
            $table->char('identity_hash', 64)->unique();
            $table->string('display_name', 191)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_oauth_identities');
        Schema::dropIfExists('account_passkeys');
    }
};
