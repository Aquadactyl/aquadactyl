<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Illuminate\Contracts\Console\Kernel;
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

    public function update(AppearanceSettingsFormRequest $request, SettingsRepositoryInterface $settings, AlertsMessageBag $alerts, Kernel $kernel): RedirectResponse
    {
        $this->ensureEditable();
        DB::transaction(function () use ($request, $settings) {
            foreach ($request->validated() as $key => $value) {
                $setting = in_array($key, ['app:name', 'aquadactyl:branding:show_name'], true) ? $key : 'aquadactyl:appearance:' . $key;
                $settings->set('settings::' . $setting, $key === 'primary_color' ? strtolower($value) : $value);
            }
        });
        if ($request->has('app:name')) {
            $kernel->call('queue:restart');
        }
        $alerts->success(__('admin/custom.appearance_saved'))->flash();

        return redirect()->route('admin.settings.appearance');
    }

    public function upload(UpdateBackgroundRequest $request, string $area, SiteBackgroundService $backgrounds, AlertsMessageBag $alerts, SettingsRepositoryInterface $settings, AppearanceService $appearance): RedirectResponse|JsonResponse
    {
        $this->ensureEditable();
        $backgrounds->upload($area, $request->file('background'));
        if ($request->ajax() && $request->wantsJson()) {
            $path = $settings->get('settings::aquadactyl:appearance:' . $area . '_background_path', null);

            return response()->json(['url' => $appearance->backgroundUrl($path, $area), 'message' => __('admin/custom.background_saved')]);
        }
        $alerts->success(__('admin/custom.background_saved'))->flash();

        return redirect()->route('admin.settings.appearance');
    }

    public function remove(Request $request, string $area, SiteBackgroundService $backgrounds, AlertsMessageBag $alerts): RedirectResponse|JsonResponse
    {
        $this->ensureEditable();
        $backgrounds->remove($area);
        if ($request->ajax() && $request->wantsJson()) {
            return response()->json(['url' => null, 'message' => __('admin/custom.background_removed')]);
        }
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
