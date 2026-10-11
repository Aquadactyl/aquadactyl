<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Pterodactyl\Services\Users\LanguageService;
use Pterodactyl\Http\Requests\Api\Client\Account\UpdateLanguageRequest;

class AccountLanguageController extends ClientApiController
{
    public function update(UpdateLanguageRequest $request, LanguageService $languages): array
    {
        $user = $request->user();
        $user->forceFill(['language' => $request->validated('language')])->save();

        return [
            'language' => $user->language,
            'locale' => $languages->resolve($user->language, $request->getLanguages()),
        ];
    }
}
