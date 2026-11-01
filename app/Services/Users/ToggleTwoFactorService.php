<?php

namespace Pterodactyl\Services\Users;

use Pterodactyl\Models\User;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Contracts\Encryption\Encrypter;
use Pterodactyl\Contracts\Repository\UserRepositoryInterface;
use Pterodactyl\Repositories\Eloquent\RecoveryTokenRepository;
use Pterodactyl\Exceptions\Service\User\TwoFactorAuthenticationTokenInvalid;

class ToggleTwoFactorService
{
    /**
     * ToggleTwoFactorService constructor.
     */
    public function __construct(
        private ConnectionInterface $connection,
        private Encrypter $encrypter,
        private Google2FA $google2FA,
        private RecoveryTokenRepository $recoveryTokenRepository,
        private UserRepositoryInterface $repository,
        private TwoFactorRecoveryTokenService $recoveryTokenService,
    ) {
    }

    /**
     * Toggle 2FA on an account only if the token provided is valid.
     *
     * @throws \Throwable
     * @throws \PragmaRX\Google2FA\Exceptions\IncompatibleWithGoogleAuthenticatorException
     * @throws \PragmaRX\Google2FA\Exceptions\InvalidCharactersException
     * @throws \PragmaRX\Google2FA\Exceptions\SecretKeyTooShortException
     * @throws TwoFactorAuthenticationTokenInvalid
     */
    public function handle(User $user, string $token, ?bool $toggleState = null): array
    {
        $secret = $this->encrypter->decrypt($user->totp_secret);

        $isValidToken = $this->google2FA->verifyKey($secret, $token, config()->get('pterodactyl.auth.2fa.window'));

        if (!$isValidToken) {
            throw new TwoFactorAuthenticationTokenInvalid();
        }

        return $this->connection->transaction(function () use ($user, $toggleState) {
            // Now that we're enabling 2FA on the account, generate 10 recovery tokens for the account
            // and store them hashed in the database. We'll return them to the caller so that the user
            // can see and save them.
            //
            // If a user is unable to login with a 2FA token they can provide one of these backup codes
            // which will then be marked as deleted from the database and will also bypass 2FA protections
            // on their account.
            $tokens = [];
            if ((!$toggleState && !$user->use_totp) || $toggleState) {
                $tokens = $this->recoveryTokenService->handle($user);
            }

            $this->repository->withoutFreshModel()->update($user->id, [
                'totp_authenticated_at' => null,
                'use_totp' => (is_null($toggleState) ? !$user->use_totp : $toggleState),
            ]);

            return $tokens;
        });
    }
}
