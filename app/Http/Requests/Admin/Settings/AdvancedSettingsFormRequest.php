<?php

namespace Pterodactyl\Http\Requests\Admin\Settings;

use Illuminate\Validation\Rule;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class AdvancedSettingsFormRequest extends AdminFormRequest
{
    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->input('recaptcha:provider') === 'disabled') {
            $this->merge([
                'recaptcha:enabled' => 'false',
            ]);
        } elseif (in_array($this->input('recaptcha:provider'), ['recaptcha', 'hcaptcha', 'turnstile'], true)) {
            $this->merge([
                'recaptcha:enabled' => 'true',
            ]);
        }
    }

    /**
     * Return all the rules to apply to this request's data.
     */
    public function rules(): array
    {
        return [
            'recaptcha:enabled' => 'required|in:true,false',
            'recaptcha:provider' => [
                'nullable',
                'required_if:recaptcha:enabled,true',
                Rule::in($this->input('recaptcha:enabled') === 'true'
                    ? ['recaptcha', 'hcaptcha', 'turnstile']
                    : ['recaptcha', 'hcaptcha', 'turnstile', 'disabled']
                ),
            ],
            'recaptcha:secret_key' => 'nullable|required_if:recaptcha:enabled,true|string|max:191',
            'recaptcha:website_key' => 'nullable|required_if:recaptcha:enabled,true|string|max:191',
            'pterodactyl:guzzle:timeout' => 'required|integer|between:1,60',
            'pterodactyl:guzzle:connect_timeout' => 'required|integer|between:1,60',
            'pterodactyl:client_features:allocations:enabled' => 'required|in:true,false',
            'pterodactyl:client_features:allocations:range_start' => [
                'nullable',
                'required_if:pterodactyl:client_features:allocations:enabled,true',
                'integer',
                'between:1024,65535',
            ],
            'pterodactyl:client_features:allocations:range_end' => [
                'nullable',
                'required_if:pterodactyl:client_features:allocations:enabled,true',
                'integer',
                'between:1024,65535',
                'gt:pterodactyl:client_features:allocations:range_start',
            ],
        ];
    }

    public function attributes(): array
    {
        return [
            'recaptcha:enabled' => 'Captcha Status',
            'recaptcha:provider' => 'Captcha Provider',
            'recaptcha:secret_key' => 'Captcha Secret Key',
            'recaptcha:website_key' => 'Captcha Site Key',
            'pterodactyl:guzzle:timeout' => 'HTTP Request Timeout',
            'pterodactyl:guzzle:connect_timeout' => 'HTTP Connection Timeout',
            'pterodactyl:client_features:allocations:enabled' => 'Auto Create Allocations Enabled',
            'pterodactyl:client_features:allocations:range_start' => 'Starting Port',
            'pterodactyl:client_features:allocations:range_end' => 'Ending Port',
        ];
    }

    /**
     * Normalize the request data before persisting to the settings table.
     */
    public function normalize(?array $only = null): array
    {
        $data = parent::normalize($only);

        if (($data['recaptcha:provider'] ?? null) === 'disabled' || ($data['recaptcha:enabled'] ?? null) === 'false') {
            $data['recaptcha:enabled'] = 'false';
            $currentProvider = config('recaptcha.provider', 'recaptcha');
            if (!in_array($currentProvider, ['recaptcha', 'hcaptcha', 'turnstile'], true)) {
                $currentProvider = 'recaptcha';
            }
            $data['recaptcha:provider'] = ($data['recaptcha:provider'] === 'disabled')
                ? $currentProvider
                : ($data['recaptcha:provider'] ?? $currentProvider);
        }

        return $data;
    }
}

