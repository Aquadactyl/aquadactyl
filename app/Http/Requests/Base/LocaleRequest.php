<?php

namespace Pterodactyl\Http\Requests\Base;

use Illuminate\Foundation\Http\FormRequest;
use Pterodactyl\Services\Users\LanguageService;

class LocaleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // The multiload backend joins values with "+", decoded as a space in query strings.
            'locale' => ['required', 'string', 'max:359', 'regex:/^' . LanguageService::CODE_PATTERN . '(?:[+ ]' . LanguageService::CODE_PATTERN . '){0,9}$/D'],
            'namespace' => ['required', 'string', 'max:191', 'regex:/^[a-z][a-z0-9_-]*(?:[+ ][a-z][a-z0-9_-]*){0,9}$/D'],
        ];
    }
}
