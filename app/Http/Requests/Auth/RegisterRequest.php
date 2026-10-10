<?php

namespace Pterodactyl\Http\Requests\Auth;

use Pterodactyl\Rules\Username;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) config('aquadactyl.features.registration', false);
    }

    /**
     * Validation rules for registering an account.
     */
    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'between:1,191', 'unique:users,username', new Username()],
            'email' => ['required', 'string', 'email:strict', 'between:1,191', 'unique:users,email'],
            'name_first' => ['sometimes', 'nullable', 'string', 'between:1,191'],
            'first_name' => ['sometimes', 'nullable', 'string', 'between:1,191'],
            'name_last' => ['sometimes', 'nullable', 'string', 'between:1,191'],
            'last_name' => ['sometimes', 'nullable', 'string', 'between:1,191'],
            'password' => ['required', 'string', 'confirmed', 'min:8'],
        ];
    }

    /**
     * Human-readable attributes.
     */
    public function attributes(): array
    {
        return [
            'username' => 'Username',
            'email' => 'Email',
            'name_first' => 'First Name',
            'first_name' => 'First Name',
            'name_last' => 'Last Name',
            'last_name' => 'Last Name',
            'password' => 'Password',
            'password_confirmation' => 'Password Confirmation',
        ];
    }

    /**
     * Normalize the registration data into user creation attributes.
     */
    public function normalize(): array
    {
        $data = $this->only([
            'username',
            'email',
            'password',
        ]);

        $firstName = $this->input('name_first') ?? $this->input('first_name');
        $lastName = $this->input('name_last') ?? $this->input('last_name');

        $data['name_first'] = !empty(trim((string) $firstName)) ? trim((string) $firstName) : $this->input('username');
        $data['name_last'] = !empty(trim((string) $lastName)) ? trim((string) $lastName) : $this->input('username');

        return $data;
    }
}

