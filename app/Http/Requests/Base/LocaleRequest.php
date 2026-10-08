<?php

namespace Pterodactyl\Http\Requests\Base;

use Illuminate\Foundation\Http\FormRequest;

class LocaleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // The multiload backend joins values with "+", decoded as a space in query strings.
            'locale' => ['required', 'string', 'max:29', 'regex:/^[a-z]{2}(?:[+ ][a-z]{2}){0,9}$/'],
            'namespace' => ['required', 'string', 'max:191', 'regex:/^[a-z]+(?:[+ ][a-z]+){0,9}$/'],
        ];
    }
}
