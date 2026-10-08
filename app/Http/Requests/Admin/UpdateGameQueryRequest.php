<?php

namespace Pterodactyl\Http\Requests\Admin;

use Illuminate\Validation\Rule;

class UpdateGameQueryRequest extends AdminFormRequest
{
    public function rules(): array
    {
        $server = $this->route()->parameter('server');

        return [
            'game_query_type' => ['required', Rule::in(array_merge(['auto', 'none'], array_keys(config('game-query.games'))))],
            'game_query_allocation_id' => ['nullable', 'integer', Rule::exists('allocations', 'id')->where('server_id', $server->id)->where('node_id', $server->node_id)],
        ];
    }
}
