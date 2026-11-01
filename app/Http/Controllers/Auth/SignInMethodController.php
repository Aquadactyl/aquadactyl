<?php

namespace Pterodactyl\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Services\Accounts\PasskeyService;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;

class SignInMethodController extends AbstractLoginController
{
    public function index(Request $request, AccountSecuritySettings $settings): JsonResponse
    {
        $checkpoint = $request->session()->get('auth_confirmation_token');
        $pending = $request->query('oauth') === 'checkpoint' && is_array($checkpoint)
            && isset($checkpoint['expires_at']) && $checkpoint['expires_at']->isFuture();

        return response()->json([
            'passkeys_enabled' => $settings->passkeysEnabled(),
            'providers' => $settings->publicProviders(),
            'confirmation_token' => $pending ? $checkpoint['token_value'] : null,
            'error' => $request->session()->pull('oauth_error'),
        ])->header('Cache-Control', 'no-store, private');
    }

    public function options(Request $request, PasskeyService $passkeys): JsonResponse
    {
        return response()->json($passkeys->loginOptions($request))->header('Cache-Control', 'no-store, private');
    }

    public function authenticate(Request $request, PasskeyService $passkeys): JsonResponse
    {
        $data = $request->validate(PasskeyService::rules());
        $user = $passkeys->authenticate($request, $data);

        return $this->beginLogin($user, $request);
    }
}
