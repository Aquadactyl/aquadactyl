<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class PwaController extends Controller
{
    public function index(): View
    {
        return view('admin.settings.pwa', ['disabled' => (bool) config('pterodactyl.load_environment_only', false)]);
    }

    public function update(Request $request, SettingsRepositoryInterface $settings, AlertsMessageBag $alerts): RedirectResponse
    {
        if (config('pterodactyl.load_environment_only', false)) {
            throw new DisplayException(__('admin/custom.environment_only'));
        }
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'offline_enabled' => ['required', 'boolean'],
            'app_name' => ['nullable', 'string', 'max:191'],
            'short_name' => ['nullable', 'string', 'max:30'],
        ]);
        DB::transaction(function () use ($data, $settings) {
            foreach (['enabled', 'offline_enabled'] as $key) {
                $settings->set('settings::aquadactyl:pwa:' . $key, $data[$key] ? 'true' : 'false');
            }
            foreach (['app_name', 'short_name'] as $key) {
                $settings->set('settings::aquadactyl:pwa:' . $key, $data[$key] ?? '');
            }
        });
        $alerts->success(__('pwa.saved'))->flash();

        return new RedirectResponse(route('admin.settings.pwa', [], false));
    }
}
