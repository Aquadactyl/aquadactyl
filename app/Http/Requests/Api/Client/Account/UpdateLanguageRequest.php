<?php

namespace Pterodactyl\Http\Requests\Api\Client\Account;

use Illuminate\Validation\Rule;
use Pterodactyl\Services\Users\LanguageService;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class UpdateLanguageRequest extends ClientApiRequest
{
    public function rules(): array
    {
        return [
            'language' => [
                'required',
                'string',
                Rule::in([
                    LanguageService::AUTOMATIC,
                    ...array_keys(app(LanguageService::class)->available()),
                ]),
            ],
        ];
    }
}
