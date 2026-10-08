<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Settings\SiteLogoService;
use Pterodactyl\Http\Requests\Admin\Settings\UpdateLogoRequest;

class LogoController extends Controller
{
    public function __construct(private SiteLogoService $logos, private AlertsMessageBag $alert)
    {
    }

    public function store(UpdateLogoRequest $request): RedirectResponse
    {
        $this->logos->upload($request->file('logo'));
        $this->alert->success('The site logo has been updated.')->flash();

        return redirect()->route('admin.settings');
    }

    public function destroy(): RedirectResponse
    {
        $this->logos->remove();
        $this->alert->success('The default site branding has been restored.')->flash();

        return redirect()->route('admin.settings');
    }
}
