<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\Permission;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Pterodactyl\Models\Filters\MultiFieldServerFilter;
use Pterodactyl\Transformers\Api\Client\ServerTransformer;
use Pterodactyl\Http\Requests\Api\Client\GetServersRequest;
use Pterodactyl\Services\Servers\ServerListRelationsService;

class ClientController extends ClientApiController
{
    /**
     * ClientController constructor.
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Return all the servers available to the client making the API
     * request, including servers the user has access to as a subuser.
     */
    public function index(GetServersRequest $request): array
    {
        $user = $request->user();
        $type = $request->input('type');
        $transformer = $this->getTransformer(ServerTransformer::class);

        // Start the query builder and ensure we eager load any requested relationships from the request.
        $builder = QueryBuilder::for(
            Server::query()->with($this->getIncludesForTransformer($transformer, ['node']))
        )->allowedFilters(
            'uuid',
            'name',
            'description',
            'external_id',
            AllowedFilter::custom('*', new MultiFieldServerFilter($user->root_admin && in_array($type, ['admin', 'admin-all']))),
        );

        // Either return all the servers the user has access to because they are an admin `?type=admin` or
        // just return all the servers the user has access to because they are the owner or a subuser of the
        // server. If ?type=admin-all is passed all servers on the system will be returned to the user, rather
        // than only servers they can see because they are an admin.
        if (in_array($type, ['admin', 'admin-all'])) {
            // If they aren't an admin but want all the admin servers don't fail the request, just
            // make it a query that will never return any results back.
            if (!$user->root_admin) {
                $builder->whereRaw('1 = 2');
            } else {
                $builder = $type === 'admin-all'
                    ? $builder
                    : $builder->whereNotIn('servers.id', $user->accessibleServers()->select('servers.id'));
            }
        } elseif ($type === 'owner') {
            $builder = $builder->where('servers.owner_id', $user->id);
        } else {
            $builder = $builder->whereIn('servers.id', $user->accessibleServers()->select('servers.id'));
        }

        $foldersEnabled = config('aquadactyl.features.server_folders', true) === true;
        if ($foldersEnabled && ($folder = $request->query('folder'))) {
            $assignments = DB::table('server_folder_assignments')->select('server_id')->where('user_id', $user->id);
            if ($folder === 'unfiled') {
                $builder->whereNotIn('servers.id', $assignments);
            } else {
                abort_unless(DB::table('server_folders')->where('user_id', $user->id)->where('id', $folder)->exists(), 404);
                $builder->whereIn('servers.id', $assignments->where('server_folder_id', $folder));
            }
        }
        $servers = $builder->paginate(min($request->query('per_page', 50), 100))->appends($request->query());
        app(ServerListRelationsService::class)->handle($servers->getCollection());
        $folders = $foldersEnabled ? DB::table('server_folder_assignments')->where('user_id', $user->id)
            ->whereIn('server_id', $servers->getCollection()->modelKeys())->pluck('server_folder_id', 'server_id') : collect();
        foreach ($servers as $server) {
            $server->setAttribute('user_folder_id', $folders->get($server->id));
        }

        return $this->fractal->transformWith($transformer)->collection($servers)->toArray();
    }

    /**
     * Returns all the subuser permissions available on the system.
     */
    public function permissions(): array
    {
        return [
            'object' => 'system_permissions',
            'attributes' => [
                'permissions' => Permission::permissions(),
            ],
        ];
    }
}
