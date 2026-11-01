<?php

namespace Pterodactyl\Http\Requests\Admin\Settings;

use Illuminate\Validation\Rule;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class MailSettingsFormRequest extends AdminFormRequest
{
    public const DRIVER_FIELDS = [
        'smtp' => ['mail:mailers:smtp:host', 'mail:mailers:smtp:port', 'mail:mailers:smtp:encryption', 'mail:mailers:smtp:username', 'mail:mailers:smtp:password'],
        'mailgun' => ['services:mailgun:domain', 'services:mailgun:secret', 'services:mailgun:endpoint'],
        'postmark' => ['services:postmark:token', 'mail:mailers:postmark:message_stream_id'],
        'ses' => ['services:ses:key', 'services:ses:secret', 'services:ses:region'],
        'log' => [],
    ];

    /**
     * Return rules to validate mail settings POST data against.
     */
    public function rules(): array
    {
        $driver = $this->input('mail:default', config('mail.default'));
        $driver = is_string($driver) ? $driver : '';
        $rules = [
            'mail:default' => ['sometimes', 'required', Rule::in(array_keys(self::DRIVER_FIELDS))],
            'mail:from:address' => 'required|string|email',
            'mail:from:name' => 'nullable|string|max:191',
        ];

        $fields = [
            'smtp' => [
                'mail:mailers:smtp:host' => 'required|string|max:255',
                'mail:mailers:smtp:port' => 'required|integer|between:1,65535',
                'mail:mailers:smtp:encryption' => ['present', Rule::in([null, 'tls', 'ssl'])],
                'mail:mailers:smtp:username' => 'nullable|string|max:191',
                'mail:mailers:smtp:password' => 'nullable|string|max:4096',
            ],
            'mailgun' => [
                'services:mailgun:domain' => ['required', 'string', 'max:255', 'regex:/\A[a-zA-Z0-9.-]+\z/'],
                'services:mailgun:secret' => $this->secretRules('services.mailgun.secret'),
                'services:mailgun:endpoint' => ['required', Rule::in(['api.mailgun.net', 'api.eu.mailgun.net'])],
            ],
            'postmark' => [
                'services:postmark:token' => $this->secretRules('services.postmark.token'),
                'mail:mailers:postmark:message_stream_id' => ['required', 'string', 'max:100', 'regex:/\A[a-zA-Z0-9_-]+\z/'],
            ],
            'ses' => [
                'services:ses:key' => $this->secretRules('services.ses.key'),
                'services:ses:secret' => $this->secretRules('services.ses.secret'),
                'services:ses:region' => ['required', 'string', 'max:40', 'regex:/\A[a-z]{2}(?:-[a-z]+)+-\d+\z/'],
            ],
        ];

        return array_merge($rules, $fields[$driver] ?? []);
    }

    private function secretRules(string $key): array
    {
        return [Rule::requiredIf(empty(config($key))), 'nullable', 'string', 'max:4096'];
    }

    public function attributes(): array
    {
        return [
            'mail:default' => __('admin/custom.mail_service'),
            'mail:from:address' => __('admin/ui.mail_from'),
            'mail:from:name' => __('admin/ui.mail_from_name'),
            'mail:mailers:smtp:host' => __('admin/ui.smtp_host'),
            'mail:mailers:smtp:port' => __('admin/ui.smtp_port'),
            'mail:mailers:smtp:encryption' => __('admin/ui.encryption'),
            'mail:mailers:smtp:username' => __('admin/ui.username'),
            'mail:mailers:smtp:password' => __('admin/ui.password'),
            'services:mailgun:domain' => __('admin/custom.mailgun_domain'),
            'services:mailgun:secret' => __('admin/custom.api_key'),
            'services:mailgun:endpoint' => __('admin/custom.mailgun_region'),
            'services:postmark:token' => __('admin/custom.postmark_token'),
            'mail:mailers:postmark:message_stream_id' => __('admin/custom.postmark_stream'),
            'services:ses:key' => __('admin/custom.ses_key'),
            'services:ses:secret' => __('admin/custom.ses_secret'),
            'services:ses:region' => __('admin/custom.ses_region'),
        ];
    }

    /**
     * Override the default normalization function for this type of request
     * as we need to accept empty values on the keys.
     */
    public function normalize(?array $only = null): array
    {
        $values = parent::normalize($only);
        foreach (\Pterodactyl\Providers\SettingsServiceProvider::getEncryptedKeys() as $key) {
            if (($values[$key] ?? null) === null || $values[$key] === '') {
                unset($values[$key]);
            }
        }

        return $values;
    }
}
