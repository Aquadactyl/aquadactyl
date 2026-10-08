<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\Http\Controllers\Base\SiteBrandingController;

Route::prefix('/branding/site')->name('site-branding.')->group(function () {
    Route::get('/icons/{size}.png', [SiteBrandingController::class, 'icon'])->where('size', '16|32|48|70|150|180|192|256|310|512')->name('icon');
    Route::get('/favicon.ico', [SiteBrandingController::class, 'favicon'])->name('favicon');
    Route::get('/mask-icon.svg', [SiteBrandingController::class, 'mask'])->name('mask');
    Route::get('/manifest.webmanifest', [SiteBrandingController::class, 'manifest'])->name('manifest');
    Route::get('/browserconfig.xml', [SiteBrandingController::class, 'browserconfig'])->name('browserconfig');
});

// Keep browser defaults and previously installed shortcuts on the current branding.
Route::get('/favicon.ico', [SiteBrandingController::class, 'favicon']);
Route::get('/favicons/favicon.ico', [SiteBrandingController::class, 'favicon']);
Route::get('/favicons/manifest.json', [SiteBrandingController::class, 'manifest']);
Route::get('/favicons/browserconfig.xml', [SiteBrandingController::class, 'browserconfig']);
