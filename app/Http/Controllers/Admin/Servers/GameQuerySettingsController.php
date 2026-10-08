<?php

namespace Pterodactyl\Http\Controllers\Admin\Servers;

use Pterodactyl\Models\Server;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Http\Requests\Admin\UpdateGameQueryRequest;

class GameQuerySettingsController extends Controller
{
    public function __construct(private AlertsMessageBag $alert)
    {
    }

    public function update(UpdateGameQueryRequest $request, Server $server): RedirectResponse
    {
        $server->forceFill($request->validated())->save();
        $this->alert->success('Game query settings saved.')->flash();

        return redirect()->route('admin.servers.view.details', $server->id);
    }
}
