<?php

namespace Pterodactyl\Http\Controllers\Auth;

use Illuminate\Http\JsonResponse;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Services\Users\UserCreationService;
use Pterodactyl\Http\Requests\Auth\RegisterRequest;

class RegisterController extends AbstractLoginController
{
    /**
     * RegisterController constructor.
     */
    public function __construct(private UserCreationService $creationService)
    {
        parent::__construct();
    }

    /**
     * Handle an account registration request.
     *
     * @throws DisplayException
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        if (!config('aquadactyl.features.registration', false)) {
            throw new DisplayException(trans('auth.registration_disabled'));
        }

        $data = $request->normalize();
        $data['root_admin'] = false;
        if (empty($data['language'])) {
            $data['language'] = config('app.locale', 'en');
        }

        $user = $this->creationService->handle($data);

        return $this->sendLoginResponse($user, $request);
    }
}

