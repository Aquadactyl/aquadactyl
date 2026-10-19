<?php

namespace Pterodactyl\Http\Requests\Admin\Node;

class InlineNodeRequest extends NodeFormRequest
{
    public function rules(): array
    {
        return array_replace(parent::rules(), [
            'scheme' => 'required|in:http,https',
            'allocation_ip' => 'required|ip',
            'allocation_port' => 'required|integer|between:1,65535',
        ]);
    }
}
