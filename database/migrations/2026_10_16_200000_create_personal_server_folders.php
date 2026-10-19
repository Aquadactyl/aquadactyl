<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('server_folders', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->string('name', 64);
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['user_id', 'name']);
            $table->unique(['id', 'user_id']);
        });
        Schema::create('server_folder_assignments', function (Blueprint $table) {
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('server_id');
            $table->unsignedInteger('server_folder_id');
            $table->primary(['user_id', 'server_id']);
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('server_id')->references('id')->on('servers')->cascadeOnDelete();
            $table->foreign(['server_folder_id', 'user_id'], 'server_folder_assignment_owner_fk')
                ->references(['id', 'user_id'])->on('server_folders')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_folder_assignments');
        Schema::dropIfExists('server_folders');
    }
};
