<?php

namespace Pterodactyl\Http\Requests\Admin\Egg;

use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class EggDownloadImportRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'nest_id' => $this->input('nest_id') === 'new' ? 'required' : 'required|integer|exists:nests,id',
            'new_nest_name' => 'nullable|required_if:nest_id,new|string|max:191',
            'egg_hash' => 'required|string|regex:/\A[a-f0-9]{64}\z/',
        ];
    }
}
