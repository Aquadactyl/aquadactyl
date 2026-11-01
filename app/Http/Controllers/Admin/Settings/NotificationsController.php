<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Services\Notifications\NotificationSettings;

class NotificationsController extends Controller
{
    public function index(NotificationSettings $settings): View
    {
        return view('admin.settings.notifications', $settings->get());
    }

    public function update(Request $request, ConfirmAccountPassword $confirmation, IntegrationSettings $settings): RedirectResponse
    {
        $confirmation->handle($request);
        $data = $request->validate(['enabled' => 'required|boolean', 'discord_enabled' => 'required|boolean']);
        foreach ($data as $key => $value) {
            $settings->set('notifications:' . $key, $value ? '1' : '0');
        }
        app(\Prologue\Alerts\AlertsMessageBag::class)->success(__('notifications.saved'))->flash();

        return new RedirectResponse(route('admin.settings.notifications', [], false));
    }
}
