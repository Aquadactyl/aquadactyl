<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Services\Users\ProfilePictureService;
use Pterodactyl\Transformers\Api\Client\AccountTransformer;
use Pterodactyl\Http\Requests\Api\Client\Account\UpdateAvatarRequest;

class AccountAvatarController extends ClientApiController
{
    public function store(UpdateAvatarRequest $request, ProfilePictureService $service): array
    {
        $user = $service->upload($request->user(), $request->file('avatar'));
        Activity::event('user:account.avatar-updated')->log();

        return $this->fractal->item($user)
            ->transformWith($this->getTransformer(AccountTransformer::class))
            ->toArray();
    }

    public function destroy(Request $request, ProfilePictureService $service): array
    {
        $user = $service->remove($request->user());
        Activity::event('user:account.avatar-removed')->log();

        return $this->fractal->item($user)
            ->transformWith($this->getTransformer(AccountTransformer::class))
            ->toArray();
    }
}
