<?php

namespace Pterodactyl\Services\Accounts;

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class ConfirmAccountPassword
{
    public function handle(Request $request): User
    {
        // These endpoints only accept the web session, never a bearer API key.
        $user = $request->user('web');
        abort_unless($user instanceof User, 401);
        $data = $request->validate(['current_password' => ['required', 'string', 'max:1024']]);
        $key = 'account-password-confirmation:' . $user->id;
        if (RateLimiter::tooManyAttempts($key, 10)) {
            throw new TooManyRequestsHttpException(RateLimiter::availableIn($key), 'Too many password confirmation attempts. Please wait before trying again.');
        }
        // Reserve an attempt before hashing, including concurrent requests from other IPs.
        RateLimiter::hit($key, 60);
        if (!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Your current password is incorrect.']);
        }
        RateLimiter::clear($key);

        return $user;
    }
}
