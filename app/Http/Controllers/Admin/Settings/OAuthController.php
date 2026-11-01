<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Crypt;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;
use Pterodactyl\Services\Accounts\OAuth\OpenIdConnectDiscovery;

class OAuthController extends Controller
{
    public function index(AccountSecuritySettings $settings): View
    {
        $providers = [];
        foreach (array_keys(AccountSecuritySettings::PROVIDERS) as $id) {
            $config = $settings->provider($id);
            unset($config['client_secret']);
            $providers[$id] = $config;
        }

        return view('admin.settings.oauth', ['providers' => $providers, 'passkeysEnabled' => $settings->get('passkeys:enabled', '1') === '1', 'origin' => $settings->origin()]);
    }

    public function update(Request $request, AccountSecuritySettings $settings, ConfirmAccountPassword $confirmation, AlertsMessageBag $alerts): RedirectResponse
    {
        $confirmation->handle($request);
        $data = $request->validate([
            'passkeys_enabled' => ['required', 'boolean'],
            'providers' => ['required', 'array:discord,github,google,oidc', 'size:4'],
            'providers.*' => ['required', 'array:enabled,client_id,client_secret,clear_secret,issuer,label'],
            'providers.*.enabled' => ['required', 'boolean'],
            'providers.*.client_id' => ['nullable', 'string', 'max:255'],
            'providers.*.client_secret' => ['nullable', 'string', 'max:4096'],
            'providers.*.clear_secret' => ['sometimes', 'boolean'],
            'providers.*.issuer' => ['nullable', 'string', 'max:2048'],
            'providers.*.label' => ['nullable', 'string', 'max:60'],
        ]);
        foreach (array_keys(AccountSecuritySettings::PROVIDERS) as $id) {
            $input = $data['providers'][$id];
            $existing = $settings->provider($id);
            if ($input['enabled'] && (empty($input['client_id']) || ((!empty($input['clear_secret']) || $existing['client_secret'] === '') && empty($input['client_secret'])))) {
                throw ValidationException::withMessages(['providers.' . $id . '.enabled' => __('admin/ui.oauth_credentials_required')]);
            }
            if ($id === 'oidc' && !empty($input['issuer'])) {
                try {
                    OpenIdConnectDiscovery::requireHttps($input['issuer']);
                    if (parse_url($input['issuer'], PHP_URL_QUERY) !== null) {
                        throw new \RuntimeException();
                    }
                } catch (\RuntimeException) {
                    throw ValidationException::withMessages(['providers.oidc.issuer' => __('admin/ui.oidc_https_required')]);
                }
            }
            if ($id === 'oidc' && $input['enabled'] && empty($input['issuer'])) {
                throw ValidationException::withMessages(['providers.oidc.issuer' => __('admin/ui.oidc_issuer_required')]);
            }
        }
        DB::transaction(function () use ($data, $settings) {
            $settings->set('passkeys:enabled', $data['passkeys_enabled'] ? '1' : '0');
            foreach (array_keys(AccountSecuritySettings::PROVIDERS) as $id) {
                $input = $data['providers'][$id];
                $prefix = 'oauth:' . $id . ':';
                $settings->set($prefix . 'enabled', $input['enabled'] ? '1' : '0');
                $settings->set($prefix . 'client_id', $input['client_id'] ?? '');
                if (!empty($input['client_secret'])) {
                    $settings->set($prefix . 'client_secret', Crypt::encryptString($input['client_secret']));
                } elseif (!empty($input['clear_secret'])) {
                    $settings->set($prefix . 'client_secret', '');
                }
                if ($id === 'oidc') {
                    $settings->set($prefix . 'issuer', $input['issuer'] ?? '');
                    $settings->set($prefix . 'label', $input['label'] ?? '');
                }
            }
        });
        $alerts->success(__('admin/ui.oauth_saved'))->flash();

        return new RedirectResponse(route('admin.settings.oauth', [], false));
    }
}
