<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Http\Requests\Api\Client\ServerFolderRequest;

class ServerFolderController extends ClientApiController
{
    public function index(ServerFolderRequest $request): array
    {
        return ['data' => DB::table('server_folders')->where('user_id', $request->user()->id)
            ->orderBy('name')->get(['id', 'name'])->all()];
    }

    public function store(ServerFolderRequest $request): array
    {
        $data = $request->validate($this->nameRules($request->user()->id));
        $id = DB::table('server_folders')->insertGetId([
            'user_id' => $request->user()->id, 'name' => $data['name'],
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return ['id' => $id, 'name' => $data['name']];
    }

    public function update(ServerFolderRequest $request, string $folder): array
    {
        $query = DB::table('server_folders')->where('user_id', $request->user()->id)->where('id', $folder);
        abort_unless($query->exists(), 404);
        $data = $request->validate($this->nameRules($request->user()->id, $folder));
        $query->update(['name' => $data['name'], 'updated_at' => now()]);

        return ['id' => (int) $folder, 'name' => $data['name']];
    }

    public function destroy(ServerFolderRequest $request, string $folder): Response
    {
        $query = DB::table('server_folders')->where('user_id', $request->user()->id)->where('id', $folder);
        abort_unless($query->exists(), 404);
        $query->delete();

        return $this->returnNoContent();
    }

    public function assign(ServerFolderRequest $request, Server $server): Response
    {
        $user = $request->user();
        abort_unless($user->root_admin || $user->accessibleServers()->where('servers.id', $server->id)->exists(), 404);
        $data = $request->validate(['folder_id' => ['present', 'nullable', 'integer',
            Rule::exists('server_folders', 'id')->where('user_id', $user->id),
        ]]);
        $query = DB::table('server_folder_assignments')->where('user_id', $user->id)->where('server_id', $server->id);
        if ($data['folder_id'] === null) {
            $query->delete();
        } else {
            DB::table('server_folder_assignments')->updateOrInsert(
                ['user_id' => $user->id, 'server_id' => $server->id],
                ['server_folder_id' => $data['folder_id']],
            );
        }

        return $this->returnNoContent();
    }

    private function nameRules(int $userId, ?string $folder = null): array
    {
        return ['name' => ['required', 'string', 'max:64',
            Rule::unique('server_folders')->where('user_id', $userId)->ignore($folder),
        ]];
    }
}
