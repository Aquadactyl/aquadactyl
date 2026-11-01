<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Files;

class TrashFilesRequest extends DeleteFileRequest
{
    public function authorize(): bool
    {
        return config('aquadactyl.features.file_trash', false) === true && parent::authorize();
    }

    public function rules(): array
    {
        return [
            'root' => 'required|string|max:4096',
            'files' => 'required|array|min:1|max:100',
            'files.*' => ['bail', 'required', 'string', 'max:255', 'distinct', function ($attribute, $value, $fail) {
                if (in_array($value, ['.', '..'], true) || strpbrk($value, "/\\\0") !== false) {
                    $fail('Select files from one directory.');
                }
            }],
        ];
    }
}
