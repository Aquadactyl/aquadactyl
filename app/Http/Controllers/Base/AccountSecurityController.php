<?php

namespace Pterodactyl\Http\Controllers\Base;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Models\AccountPasskey;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Models\AccountOAuthIdentity;
use Pterodactyl\Services\Accounts\PasskeyService;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;

class AccountSecurityController extends Controller
{
    public function index(Request $request, AccountSecuritySettings $settings): JsonResponse
    {
        return response()->json([
            'passkeys_enabled' => $settings->passkeysEnabled(),
            'providers' => $settings->publicProviders(),
            'passkeys' => AccountPasskey::query()->where('user_id', $request->user('web')->id)->orderBy('id')->get(['id', 'name', 'created_at', 'last_used_at']),
            'identities' => AccountOAuthIdentity::query()->where('user_id', $request->user('web')->id)->orderBy('id')->get(['id', 'provider', 'display_name', 'created_at', 'last_used_at']),
            'notice' => $request->session()->pull('oauth_notice'),
            'error' => $request->session()->pull('oauth_error'),
        ])->header('Cache-Control', 'no-store, private');
    }

    public function options(Request $request, ConfirmAccountPassword $confirmation, PasskeyService $passkeys): JsonResponse
    {
        $user = $confirmation->handle($request);

        return response()->json($passkeys->registrationOptions($request, $user))->header('Cache-Control', 'no-store, private');
    }

    public function store(Request $request, PasskeyService $passkeys): Response
    {
        $data = $request->validate(PasskeyService::rules(true));
        $passkeys->register($request, $request->user('web'), $data);

        return response()->noContent();
    }

    public function deletePasskey(Request $request, int $id, ConfirmAccountPassword $confirmation): Response
    {
        $user = $confirmation->handle($request);
        AccountPasskey::query()->where('user_id', $user->id)->findOrFail($id)->delete();

        return response()->noContent();
    }

    public function unlink(Request $request, int $id, ConfirmAccountPassword $confirmation): Response
    {
        $user = $confirmation->handle($request);
        AccountOAuthIdentity::query()->where('user_id', $user->id)->findOrFail($id)->delete();

        return response()->noContent();
    }
}
