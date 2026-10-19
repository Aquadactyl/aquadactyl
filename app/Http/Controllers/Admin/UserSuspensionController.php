<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Users\UserSuspensionService;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;

class UserSuspensionController extends Controller
{
    public function update(Request $request, User $user, ConfirmAccountPassword $confirmation, UserSuspensionService $service, AlertsMessageBag $alerts): RedirectResponse
    {
        $actor = $confirmation->handle($request);
        $data = $request->validate(['suspend' => 'required|boolean', 'reason' => 'nullable|string|max:1000']);
        $service->set($user, $actor, $request->boolean('suspend'), $data['reason'] ?? null);
        $alerts->success(__('admin/management.suspension_saved'))->flash();

        return redirect()->route('admin.users.view', $user->id);
    }
}
