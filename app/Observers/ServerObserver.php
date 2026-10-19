<?php

namespace Pterodactyl\Observers;

use Pterodactyl\Events;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Jobs\SyncAccountSuspension;
use Illuminate\Foundation\Bus\DispatchesJobs;

class ServerObserver
{
    use DispatchesJobs;

    /**
     * Listen to the Server creating event.
     */
    public function creating(Server $server): void
    {
        $this->inheritAccountSuspension($server);
        event(new Events\Server\Creating($server));
    }

    /**
     * Listen to the Server created event.
     */
    public function created(Server $server): void
    {
        event(new Events\Server\Created($server));
    }

    /**
     * Listen to the Server deleting event.
     */
    public function deleting(Server $server): void
    {
        event(new Events\Server\Deleting($server));
    }

    /**
     * Listen to the Server deleted event.
     */
    public function deleted(Server $server): void
    {
        event(new Events\Server\Deleted($server));
    }

    /**
     * Listen to the Server saving event.
     */
    public function saving(Server $server): void
    {
        event(new Events\Server\Saving($server));
    }

    /**
     * Listen to the Server saved event.
     */
    public function saved(Server $server): void
    {
        event(new Events\Server\Saved($server));
    }

    /**
     * Listen to the Server updating event.
     */
    public function updating(Server $server): void
    {
        $this->inheritAccountSuspension($server);
        event(new Events\Server\Updating($server));
    }

    /**
     * Listen to the Server saved event.
     */
    public function updated(Server $server): void
    {
        if ($server->wasChanged('account_suspended')) {
            SyncAccountSuspension::dispatch($server->id)->afterCommit();
        }
        event(new Events\Server\Updated($server));
    }

    private function inheritAccountSuspension(Server $server): void
    {
        if ($server->owner_id && (!$server->exists || $server->isDirty('owner_id'))) {
            $suspended = User::whereKey($server->owner_id)->lockForUpdate()->value('suspended_at') !== null;
            if ((bool) $server->account_suspended !== $suspended) {
                $server->forceFill(['account_suspended' => $suspended, 'account_suspension_pending' => $server->exists, 'account_suspension_error' => null]);
            }
        }
    }
}
