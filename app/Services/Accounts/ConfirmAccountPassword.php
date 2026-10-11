<?php

namespace Pterodactyl\Services\Accounts;

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ConfirmAccountPassword
{
    public function handle(Request $request): User
    {
        // These endpoints only accept the web session, never a bearer API key.
        $user = $request->user('web');
        abort_unless($user instanceof User, 401);
        $data = $request->validate(['current_password' => ['required', 'string', 'max:1024']]);
        if (!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Your current password is incorrect.']);
        }

        return $user;
    }
}
