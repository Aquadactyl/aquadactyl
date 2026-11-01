<?php

namespace Pterodactyl\Http\Controllers\Auth;

use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Pterodactyl\Models\User;
use Illuminate\Http\JsonResponse;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Contracts\Encryption\Encrypter;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Pterodactyl\Events\Auth\ProvidedAuthenticationToken;
use Pterodactyl\Http\Requests\Auth\LoginCheckpointRequest;
use Illuminate\Contracts\Validation\Factory as ValidationFactory;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class LoginCheckpointController extends AbstractLoginController
{
    private const TOKEN_EXPIRED_MESSAGE = 'The authentication token provided has expired, please refresh the page and try again.';

    /**
     * LoginCheckpointController constructor.
     */
    public function __construct(
        private Encrypter $encrypter,
        private Google2FA $google2FA,
        private ValidationFactory $validation,
    ) {
        parent::__construct();
    }

    /**
     * Handle a login where the user is required to provide a TOTP authentication
     * token. Once a user has reached this stage it is assumed that they have already
     * provided a valid username and password.
     *
     * @throws \PragmaRX\Google2FA\Exceptions\IncompatibleWithGoogleAuthenticatorException
     * @throws \PragmaRX\Google2FA\Exceptions\InvalidCharactersException
     * @throws \PragmaRX\Google2FA\Exceptions\SecretKeyTooShortException
     * @throws \Exception
     * @throws \Illuminate\Validation\ValidationException
     */
    public function __invoke(LoginCheckpointRequest $request): JsonResponse
    {
        if ($this->hasTooManyLoginAttempts($request)) {
            $this->sendLockoutResponse($request);
        }

        $details = $request->session()->get('auth_confirmation_token');
        if (!$this->hasValidSessionData($details)) {
            $this->sendFailedLoginResponse($request, null, self::TOKEN_EXPIRED_MESSAGE);
        }

        if (!hash_equals($request->input('confirmation_token') ?? '', $details['token_value'])) {
            $this->sendFailedLoginResponse($request);
        }

        $failureUser = null;
        $failureMessage = null;
        $user = DB::transaction(function () use ($request, $details, &$failureUser, &$failureMessage) {
            try {
                // Serialize verification and consumption across concurrent login sessions.
                $user = User::query()->lockForUpdate()->findOrFail($details['user_id']);
            } catch (ModelNotFoundException) {
                $failureMessage = self::TOKEN_EXPIRED_MESSAGE;

                return null;
            }
            $failureUser = $user;
            if ($user->suspended_at || !$user->use_totp || !hash_equals($details['credential_fingerprint'], $this->twoFactorFingerprint($user))) {
                $request->session()->forget('auth_confirmation_token');
                $failureMessage = self::TOKEN_EXPIRED_MESSAGE;

                return null;
            }
            $attemptKey = 'auth:checkpoint:account:' . $user->id;
            if (RateLimiter::tooManyAttempts($attemptKey, max(1, $this->maxLoginAttempts))) {
                throw new TooManyRequestsHttpException(RateLimiter::availableIn($attemptKey), 'Too many two-factor attempts for this account. Please try again later.');
            }
            // This account limit survives changes of IP address, browser session and login method.
            RateLimiter::hit($attemptKey, max(1, $this->lockoutTime) * 60);

            if (!is_null($recoveryToken = $request->input('recovery_token'))) {
                if ($this->isValidRecoveryToken($user, $recoveryToken)) {
                    return $user;
                }
            } else {
                $decrypted = $this->encrypter->decrypt($user->totp_secret);
                // Supplying zero, rather than null, makes the library return the matched counter.
                $oldTimestamp = $user->totp_authenticated_at
                    ? (int) floor($user->totp_authenticated_at->unix() / $this->google2FA->getKeyRegeneration())
                    : 0;
                $verified = $this->google2FA->verifyKeyNewer(
                    $decrypted,
                    $request->input('authentication_code') ?? '',
                    $oldTimestamp,
                    config('pterodactyl.auth.2fa.window') ?? 1,
                );
                if (is_int($verified)) {
                    $user->update(['totp_authenticated_at' => Carbon::createFromTimestampUTC($verified * $this->google2FA->getKeyRegeneration())]);

                    return $user;
                }
            }

            $failureMessage = !empty($recoveryToken) ? 'The recovery token provided is not valid.' : null;

            return null;
        });

        // Failed-login listeners write audit records. Do not roll those writes back with verification.
        if (!$user) {
            $this->sendFailedLoginResponse($request, $failureUser, $failureMessage);
        }
        RateLimiter::clear('auth:checkpoint:account:' . $user->id);
        Event::dispatch(new ProvidedAuthenticationToken($user, $request->filled('recovery_token')));

        return $this->sendLoginResponse($user, $request);
    }

    /**
     * Determines if a given recovery token is valid for the user account. If we find a matching token
     * it will be deleted from the database.
     *
     * @throws \Exception
     */
    protected function isValidRecoveryToken(User $user, string $value): bool
    {
        foreach ($user->recoveryTokens as $token) {
            if (password_verify($value, $token->token)) {
                // A stale model must not accept a code another request already consumed.
                return $user->recoveryTokens()->whereKey($token->id)->where('token', $token->token)->delete() === 1;
            }
        }

        return false;
    }

    /**
     * Determines if the data provided from the session is valid or not. This
     * will return false if the data is invalid, or if more time has passed than
     * was configured when the session was written.
     */
    protected function hasValidSessionData(?array $data): bool
    {
        $validator = $this->validation->make($data ?? [], [
            'user_id' => 'required|integer|min:1',
            'token_value' => 'required|string',
            'credential_fingerprint' => 'required|string|size:64',
            'expires_at' => 'required',
        ]);

        if ($validator->fails()) {
            return false;
        }

        if (!$data['expires_at'] instanceof CarbonInterface) {
            return false;
        }

        if ($data['expires_at']->isBefore(CarbonImmutable::now())) {
            return false;
        }

        return true;
    }
}
