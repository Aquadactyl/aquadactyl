<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Settings\AppearanceService;
use Pterodactyl\Services\Settings\SiteBackgroundService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Http\Requests\Admin\Settings\UpdateBackgroundRequest;
use Pterodactyl\Http\Requests\Admin\Settings\AppearanceSettingsFormRequest;

class AppearanceController extends Controller
{
    public function index(AppearanceService $appearance): View
    {
        return view('admin.settings.appearance', ['appearance' => $appearance->publicSettings(), 'disabled' => (bool) config('pterodactyl.load_environment_only', false)]);
    }

    public function update(AppearanceSettingsFormRequest $request, SettingsRepositoryInterface $settings, AlertsMessageBag $alerts): RedirectResponse
    {
        $this->ensureEditable();
        DB::transaction(function () use ($request, $settings) {
            foreach ($request->validated() as $key => $value) {
                $settings->set('settings::aquadactyl:appearance:' . $key, $key === 'primary_color' ? strtolower($value) : $value);
            }
        });
        $alerts->success(__('admin/custom.appearance_saved'))->flash();

        return redirect()->route('admin.settings.appearance');
    }

    public function upload(UpdateBackgroundRequest $request, string $area, SiteBackgroundService $backgrounds, AlertsMessageBag $alerts): RedirectResponse
    {
        $this->ensureEditable();
        $backgrounds->upload($area, $request->file('background'));
        $alerts->success(__('admin/custom.background_saved'))->flash();

        return redirect()->route('admin.settings.appearance');
    }

    public function remove(string $area, SiteBackgroundService $backgrounds, AlertsMessageBag $alerts): RedirectResponse
    {
        $this->ensureEditable();
        $backgrounds->remove($area);
        $alerts->success(__('admin/custom.background_removed'))->flash();

        return redirect()->route('admin.settings.appearance');
    }

    private function ensureEditable(): void
    {
        if (config('pterodactyl.load_environment_only', false)) {
            throw new DisplayException(__('admin/custom.environment_only'));
        }
    }
}
