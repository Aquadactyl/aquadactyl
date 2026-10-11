<?php

namespace Pterodactyl\Services\Users;

use Carbon\Carbon;
use Illuminate\Support\Str;
use Pterodactyl\Models\User;
use Illuminate\Database\ConnectionInterface;
use Pterodactyl\Repositories\Eloquent\RecoveryTokenRepository;

class TwoFactorRecoveryTokenService
{
    /**
     * TwoFactorRecoveryTokenService constructor.
     */
    public function __construct(
        private ConnectionInterface $connection,
        private RecoveryTokenRepository $recoveryTokenRepository,
    ) {
    }

    /**
     * Generate 10 new recovery tokens for the user account and return the unhashed tokens.
     *
     * @return string[]
     *
     * @throws \Throwable
     */
    public function handle(User $user): array
    {
        return $this->connection->transaction(function () use ($user) {
            $tokens = [];
            $inserts = [];
            for ($i = 0; $i < 10; ++$i) {
                $token = Str::random(10);

                $inserts[] = [
                    'user_id' => $user->id,
                    'token' => password_hash($token, PASSWORD_DEFAULT),
                    'created_at' => Carbon::now(),
                ];

                $tokens[] = $token;
            }

            // Before inserting any new records make sure all of the old ones are deleted to avoid
            // any issues or storing an unnecessary number of tokens in the database.
            $this->recoveryTokenRepository->deleteWhere(['user_id' => $user->id]);

            // Bulk insert the hashed tokens.
            $this->recoveryTokenRepository->insert($inserts);

            return $tokens;
        });
    }
}
