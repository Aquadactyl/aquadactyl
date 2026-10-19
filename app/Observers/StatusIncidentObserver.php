<?php

namespace Pterodactyl\Observers;

use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\StatusIncident;
use Pterodactyl\Services\Webhooks\WebhookEmitter;

class StatusIncidentObserver
{
    public function created(StatusIncident $incident): void
    {
        $this->emit($incident, 'published');
    }

    public function updated(StatusIncident $incident): void
    {
        if ($incident->wasChanged(['title', 'message', 'status'])) {
            $this->emit($incident, $incident->status === 'resolved' ? 'resolved' : 'updated');
        }
    }

    public function deleted(StatusIncident $incident): void
    {
        $this->emit($incident, 'removed');
    }

    private function emit(StatusIncident $incident, string $action): void
    {
        $data = ['incident_id' => $incident->id, 'title' => $incident->title, 'message' => mb_substr($incident->message, 0, 1000), 'status' => $incident->status];
        DB::afterCommit(fn () => app(WebhookEmitter::class)->emit('status.incident.' . $action, $data));
    }
}
