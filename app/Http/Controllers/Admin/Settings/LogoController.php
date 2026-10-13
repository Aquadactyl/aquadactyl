<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Settings\SiteLogoService;
use Pterodactyl\Http\Requests\Admin\Settings\UpdateLogoRequest;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class LogoController extends Controller
{
    public function __construct(private SiteLogoService $logos, private AlertsMessageBag $alert)
    {
    }

    public function store(UpdateLogoRequest $request, SettingsRepositoryInterface $settings): RedirectResponse|JsonResponse
    {
        $this->ensureEditable();
        $this->logos->upload($request->file('logo'));
        if ($request->ajax() && $request->wantsJson()) {
            return response()->json(['url' => '/storage/' . $settings->get(SiteLogoService::SETTING, null), 'message' => __('admin/ui.logo_saved')]);
        }
        $this->alert->success(__('admin/ui.logo_saved'))->flash();

        return new RedirectResponse(route('admin.settings.appearance', [], false));
    }

    public function destroy(Request $request): RedirectResponse|JsonResponse
    {
        $this->ensureEditable();
        $this->logos->remove();
        if ($request->ajax() && $request->wantsJson()) {
            return response()->json(['url' => null, 'message' => __('admin/ui.logo_restored')]);
        }
        $this->alert->success(__('admin/ui.logo_restored'))->flash();

        return new RedirectResponse(route('admin.settings.appearance', [], false));
    }

    private function ensureEditable(): void
    {
        if (config('pterodactyl.load_environment_only', false)) {
            throw new DisplayException(__('admin/custom.environment_only'));
        }
    }
}
