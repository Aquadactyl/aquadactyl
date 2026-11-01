<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\Http\Controllers\Base;
use Pterodactyl\Http\Middleware\RequireTwoFactorAuthentication;

Route::get('/', [Base\IndexController::class, 'index'])->name('index')->fallback();
Route::get('/account', [Base\IndexController::class, 'index'])
    ->withoutMiddleware(RequireTwoFactorAuthentication::class)
    ->name('account');

Route::get('/locales/locale.json', Base\LocaleController::class)
    ->withoutMiddleware(['auth', RequireTwoFactorAuthentication::class])
    ->where('namespace', '.*');

Route::prefix('/account/security')->middleware(['auth:web', 'throttle:authentication'])->group(function () {
    Route::get('/', [Base\AccountSecurityController::class, 'index']);
    Route::post('/passkeys/options', [Base\AccountSecurityController::class, 'options']);
    Route::post('/passkeys', [Base\AccountSecurityController::class, 'store']);
    Route::delete('/passkeys/{id}', [Base\AccountSecurityController::class, 'deletePasskey'])->whereNumber('id');
    Route::post('/oauth/{provider}', [Pterodactyl\Http\Controllers\Auth\OAuthController::class, 'link']);
    Route::delete('/oauth/{id}', [Base\AccountSecurityController::class, 'unlink'])->whereNumber('id');
});

Route::get('/{react}', [Base\IndexController::class, 'index'])
    ->where('react', '^(?!(\/)?(api|auth|admin|daemon|branding/site)).+');
