<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Services\Users\TwoFactorSetupService;
use Pterodactyl\Services\Users\ToggleTwoFactorService;
use Pterodactyl\Services\Users\TwoFactorRecoveryTokenService;
use Illuminate\Contracts\Validation\Factory as ValidationFactory;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class TwoFactorController extends ClientApiController
{
    /**
     * TwoFactorController constructor.
     */
    public function __construct(
        private ToggleTwoFactorService $toggleTwoFactorService,
        private TwoFactorSetupService $setupService,
        private TwoFactorRecoveryTokenService $recoveryTokenService,
        private ValidationFactory $validation,
    ) {
        parent::__construct();
    }

    /**
     * Returns two-factor token credentials that allow a user to configure
     * it on their account. If two-factor is already enabled this endpoint
     * will return a 400 error.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function index(Request $request): JsonResponse
    {
        return $this->withLockedUser($request, function (User $user) {
            if ($user->use_totp) {
                throw new BadRequestHttpException('Two-factor authentication is already enabled on this account.');
            }

            return new JsonResponse(['data' => $this->setupService->handle($user)]);
        });
    }

    /**
     * Updates a user's account to have two-factor enabled.
     *
     * @throws \Throwable
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): JsonResponse
    {
        $validator = $this->validation->make($request->all(), [
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string'],
        ]);

        $data = $validator->validate();

        return $this->withLockedUser($request, function (User $user) use ($data) {
            if (!password_verify($data['password'], $user->password)) {
                throw new BadRequestHttpException('The password provided was not valid.');
            }

            $tokens = $this->toggleTwoFactorService->handle($user, $data['code'], true);

            Activity::event('user:two-factor.create')->log();

            return new JsonResponse(['object' => 'recovery_tokens', 'attributes' => ['tokens' => $tokens]]);
        });
    }

    /**
     * Disables two-factor authentication on an account if the password provided
     * is valid.
     *
     * @throws \Throwable
     */
    public function delete(Request $request): JsonResponse
    {
        return $this->withLockedUser($request, function (User $user) use ($request) {
            if (!password_verify($request->input('password') ?? '', $user->password)) {
                throw new BadRequestHttpException('The password provided was not valid.');
            }

            $user->update(['totp_authenticated_at' => Carbon::now(), 'use_totp' => false]);

            Activity::event('user:two-factor.delete')->log();

            return new JsonResponse([], Response::HTTP_NO_CONTENT);
        });
    }

    /**
     * Regenerates recovery tokens for an account if two-factor is enabled and the password provided is valid.
     *
     * @throws \Throwable
     * @throws \Illuminate\Validation\ValidationException
     */
    public function regenerateTokens(Request $request): JsonResponse
    {
        $validator = $this->validation->make($request->all(), [
            'password' => ['required', 'string'],
        ]);

        $data = $validator->validate();

        return $this->withLockedUser($request, function (User $user) use ($data) {
            if (!$user->use_totp) {
                throw new BadRequestHttpException('Two-factor authentication is not enabled on this account.');
            }
            if (!password_verify($data['password'], $user->password)) {
                throw new BadRequestHttpException('The password provided was not valid.');
            }

            $tokens = $this->recoveryTokenService->handle($user);

            Activity::event('user:two-factor.regenerate-tokens')->log();

            return new JsonResponse(['object' => 'recovery_tokens', 'attributes' => ['tokens' => $tokens]]);
        });
    }

    private function withLockedUser(Request $request, \Closure $callback): JsonResponse
    {
        return DB::transaction(fn () => $callback(User::query()->lockForUpdate()->findOrFail($request->user()->id)));
    }
}
