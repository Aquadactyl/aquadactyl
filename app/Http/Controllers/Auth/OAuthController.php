<?php

namespace Pterodactyl\Http\Controllers\Auth;

use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\AccountOAuthIdentity;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;
use Pterodactyl\Services\Accounts\OAuth\OAuthProviderFactory;

class OAuthController extends AbstractLoginController
{
    private function fingerprint(array $config): string
    {
        return hash('sha256', json_encode([$config['issuer'], $config['client_id'], $config['client_secret'], $config['redirect']], JSON_THROW_ON_ERROR));
    }

    private function start(Request $request, string $provider, bool $link, AccountSecuritySettings $settings, OAuthProviderFactory $factory): RedirectResponse
    {
        $config = $settings->provider($provider);
        abort_unless($config['enabled'], 404, 'This sign-in provider is disabled.');
        $user = $link ? app(ConfirmAccountPassword::class)->handle($request) : null;
        $nonce = Str::random(64);
        $driver = $factory->make($config, $nonce);
        $request->session()->put('oauth_flow', [
            'provider' => $provider, 'link' => $link, 'user_id' => $user?->id,
            'password_hash' => $user?->password, 'nonce' => $nonce,
            'fingerprint' => $this->fingerprint($config), 'expires_at' => time() + 300,
        ]);

        return $driver->redirect();
    }

    public function redirect(Request $request, string $provider, AccountSecuritySettings $settings, OAuthProviderFactory $factory): RedirectResponse
    {
        try {
            return $this->start($request, $provider, false, $settings, $factory);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            Log::warning('OAuth provider could not start.', ['provider' => $provider, 'exception' => $exception::class]);

            return redirect('/auth/login')->with('oauth_error', 'This sign-in provider is currently unavailable. Try your password instead.');
        }
    }

    public function link(Request $request, string $provider, AccountSecuritySettings $settings, OAuthProviderFactory $factory): JsonResponse
    {
        try {
            $response = $this->start($request, $provider, true, $settings, $factory);
        } catch (ValidationException|\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            Log::warning('OAuth account linking could not start.', ['provider' => $provider, 'exception' => $exception::class]);
            throw ValidationException::withMessages(['provider' => 'This sign-in provider is currently unavailable.']);
        }

        return response()->json(['redirect' => $response->getTargetUrl()]);
    }

    public function callback(Request $request, string $provider, AccountSecuritySettings $settings, OAuthProviderFactory $factory): RedirectResponse
    {
        $flow = $request->session()->pull('oauth_flow');
        $destination = is_array($flow) && ($flow['link'] ?? false) && $request->user('web') ? '/account' : '/auth/login';
        try {
            $config = $settings->provider($provider);
            $state = $request->query('state');
            $expected = $request->session()->get('state');
            if (!is_array($flow) || ($flow['provider'] ?? '') !== $provider || ($flow['expires_at'] ?? 0) < time()
                || !$config['enabled'] || !hash_equals($flow['fingerprint'] ?? '', $this->fingerprint($config))
                || !is_string($state) || !is_string($expected) || !hash_equals($expected, $state)
                || !Cache::add('oauth:consumed:' . hash('sha256', $state), true, 300)
                || $request->has('error') || !is_string($request->query('code')) || strlen($request->query('code')) > 4096) {
                throw new \RuntimeException('Invalid OAuth flow.');
            }
            if ($flow['link']) {
                $user = $request->user('web');
                if (!$user || $user->id !== $flow['user_id'] || !hash_equals($flow['password_hash'] ?? '', $user->password)) {
                    throw new \RuntimeException('Account linking session changed.');
                }
            } elseif ($request->user('web')) {
                throw new \RuntimeException('Already signed in.');
            }

            $profile = $factory->make($config, $flow['nonce'])->user();
            // Provider HTTP calls can outlive an administrator's configuration change.
            $settings->refresh();
            $currentConfig = $settings->provider($provider);
            if (!$currentConfig['enabled'] || !hash_equals($flow['fingerprint'], $this->fingerprint($currentConfig))) {
                throw new \RuntimeException('The sign-in provider configuration changed.');
            }
            $subject = (string) $profile->getId();
            if ($subject === '' || strlen($subject) > 255) {
                throw new \RuntimeException('Missing provider account ID.');
            }
            $hash = AccountOAuthIdentity::identityHash($provider, $config['issuer'], $subject);
            if ($flow['link']) {
                DB::transaction(function () use ($user, $flow, $provider, $config, $subject, $hash, $profile) {
                    // Recheck under the account lock after all provider requests finish.
                    $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
                    if ($user->suspended_at || !hash_equals($flow['password_hash'], $user->password)) {
                        throw new \RuntimeException('Account linking authorization changed.');
                    }
                    if (AccountOAuthIdentity::query()->where('identity_hash', $hash)->exists()
                        || AccountOAuthIdentity::query()->where('user_id', $user->id)->where('provider', $provider)->exists()) {
                        throw new \RuntimeException('The provider account is already linked.');
                    }
                    AccountOAuthIdentity::query()->create([
                        'user_id' => $user->id, 'provider' => $provider, 'issuer' => $config['issuer'],
                        'subject' => $subject, 'identity_hash' => $hash,
                        'display_name' => mb_substr((string) ($profile->getName() ?: $profile->getNickname() ?: $provider), 0, 191),
                    ]);
                });

                return redirect('/account')->with('oauth_notice', 'Your sign-in account has been linked.');
            }

            $identity = AccountOAuthIdentity::query()->where('identity_hash', $hash)->first();
            if (!$identity || !$identity->user) {
                return redirect('/auth/login')->with('oauth_error', 'Sign in with your password first, then link this provider in Account settings.');
            }
            $identity->update(['last_used_at' => now()]);
            $response = $this->beginLogin($identity->user, $request);

            return redirect($response->getData(true)['data']['complete'] ? '/' : '/auth/login?oauth=checkpoint');
        } catch (\Throwable $exception) {
            Log::warning('OAuth callback rejected.', ['provider' => $provider, 'exception' => $exception::class]);

            return redirect($destination)->with('oauth_error', 'The sign-in provider could not be verified or the request expired. Please try again.');
        } finally {
            $request->session()->forget(['state', 'code_verifier']);
        }
    }
}
