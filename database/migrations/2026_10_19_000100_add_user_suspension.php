<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('suspended_at')->nullable();
            $table->text('suspension_reason')->nullable();
        });
        Schema::table('servers', function (Blueprint $table) {
            $table->boolean('account_suspended')->default(false);
            $table->boolean('account_suspension_pending')->default(false)->index();
            $table->string('account_suspension_error')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->dropColumn(['account_suspended', 'account_suspension_pending', 'account_suspension_error']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['suspended_at', 'suspension_reason']);
        });
    }
};
