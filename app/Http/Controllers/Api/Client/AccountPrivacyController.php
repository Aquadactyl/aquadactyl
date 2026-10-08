<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Pterodactyl\Facades\Activity;
use Pterodactyl\Transformers\Api\Client\AccountTransformer;
use Pterodactyl\Http\Requests\Api\Client\Account\UpdatePrivacyRequest;

class AccountPrivacyController extends ClientApiController
{
    public function update(UpdatePrivacyRequest $request): array
    {
        $user = $request->user();
        $enabled = $request->boolean('blur_sensitive_data');
        if ($user->blur_sensitive_data !== $enabled) {
            $user->forceFill(['blur_sensitive_data' => $enabled])->save();
            Activity::event('user:account.privacy-updated')->subject($user)
                ->property('blur_sensitive_data', $enabled)->log();
        }

        return $this->fractal->item($user)
            ->transformWith($this->getTransformer(AccountTransformer::class))
            ->toArray();
    }
}
