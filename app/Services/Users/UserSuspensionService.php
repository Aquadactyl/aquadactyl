<?php

namespace Pterodactyl\Services\Users;

use Illuminate\Support\Str;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Facades\Activity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Jobs\RevokeSftpAccessJob;
use Pterodactyl\Jobs\SyncAccountSuspension;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;

class UserSuspensionService
{
    public function set(User $user, User $actor, bool $suspend, ?string $reason): void
    {
        if ($user->is($actor)) {
            throw ValidationException::withMessages(['suspend' => __('admin/management.cannot_suspend_self')]);
        }
        DB::transaction(function () use ($user, $actor, $suspend, $reason) {
            $administrators = User::where('root_admin', true)->orderBy('id')->lockForUpdate()->get();
            if (!$administrators->contains(fn (User $administrator) => $administrator->id === $actor->id && !$administrator->suspended_at)) {
                throw ValidationException::withMessages(['suspend' => __('admin/management.admin_access_changed')]);
            }
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $user->forceFill(['suspended_at' => $suspend ? now() : null, 'suspension_reason' => $suspend ? $reason : null]);
            if ($suspend) {
                $user->setRememberToken(Str::random(60));
            }
            $user->saveOrFail();
            $servers = Server::where('owner_id', $user->id)->where('account_suspended', !$suspend)->lockForUpdate()->pluck('id');
            Server::whereIn('id', $servers)->update(['account_suspended' => $suspend, 'account_suspension_pending' => true, 'account_suspension_error' => null]);
            foreach ($servers as $id) {
                SyncAccountSuspension::dispatch($id)->afterCommit();
            }
            if ($suspend) {
                Node::query()->eachById(fn (Node $node) => RevokeSftpAccessJob::dispatch($user->uuid, $node)->onQueue('high')->afterCommit());
            }
            Activity::event($suspend ? 'admin:user.suspended' : 'admin:user.restored')->actor($actor)->subject($user)->log();
        });
    }

    public function sync(int $id): void
    {
        Cache::lock('account-suspension:' . $id, 45)->get(function () use ($id) {
            $server = Server::find($id);
            if (!$server || !$server->account_suspension_pending) {
                return;
            }
            try {
                if ($server->transfer) {
                    throw new \RuntimeException('A transfer is in progress.');
                }
                app(DaemonServerRepository::class)->setServer($server)->sync();
                Server::whereKey($id)->where('account_suspended', $server->account_suspended)->update(['account_suspension_pending' => false, 'account_suspension_error' => null]);
            } catch (\Exception) {
                // Keep the desired state authoritative even when a daemon is offline.
                Server::whereKey($id)->update(['account_suspension_error' => 'Daemon synchronization is pending. Check the node connection and retry.']);
            }
        });
    }

    public function retryPending(): void
    {
        Server::where('account_suspension_pending', true)->eachById(fn (Server $server) => SyncAccountSuspension::dispatch($server->id));
    }
}
