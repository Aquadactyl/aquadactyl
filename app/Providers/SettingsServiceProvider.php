<?php

namespace Pterodactyl\Providers;

use Psr\Log\LoggerInterface as Log;
use Illuminate\Database\QueryException;
use Illuminate\Support\ServiceProvider;
use Illuminate\Contracts\Encryption\Encrypter;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class SettingsServiceProvider extends ServiceProvider
{
    /**
     * An array of configuration keys to override with database values
     * if they exist.
     */
    protected array $keys = [
        'app:name',
        'app:locale',
        'aquadactyl:branding:logo_path',
        'aquadactyl:branding:show_name',
        'aquadactyl:appearance:primary_color',
        'aquadactyl:appearance:login_layout',
        'aquadactyl:appearance:login_logo_position',
        'aquadactyl:appearance:login_translucency',
        'aquadactyl:appearance:login_background_path',
        'aquadactyl:appearance:login_blur',
        'aquadactyl:appearance:login_overlay',
        'aquadactyl:appearance:client_background_path',
        'aquadactyl:appearance:client_blur',
        'aquadactyl:appearance:client_overlay',
        'aquadactyl:features:player_counts',
        'aquadactyl:features:custom_profile_pictures',
        'aquadactyl:features:privacy_mode',
        'aquadactyl:features:server_quick_actions',
        'aquadactyl:features:registration',
        'aquadactyl:features:console_log_sharing',
        'aquadactyl:features:file_trash',
        'aquadactyl:trash:retention_days',
        'aquadactyl:telemetry:enabled',
        'recaptcha:enabled',
        'recaptcha:provider',
        'recaptcha:secret_key',
        'recaptcha:website_key',
        'pterodactyl:guzzle:timeout',
        'pterodactyl:guzzle:connect_timeout',
        'pterodactyl:console:count',
        'pterodactyl:console:frequency',
        'pterodactyl:auth:2fa_required',
        'pterodactyl:client_features:allocations:enabled',
        'pterodactyl:client_features:allocations:range_start',
        'pterodactyl:client_features:allocations:range_end',
    ];

    /**
     * Mail settings managed by the admin interface. Saved values take priority
     * over initial environment defaults when database settings are enabled.
     */
    protected array $emailKeys = [
        'mail:default',
        'mail:mailers:smtp:host',
        'mail:mailers:smtp:port',
        'mail:mailers:smtp:encryption',
        'mail:mailers:smtp:username',
        'mail:mailers:smtp:password',
        'mail:from:address',
        'mail:from:name',
        'services:mailgun:domain',
        'services:mailgun:secret',
        'services:mailgun:endpoint',
        'services:postmark:token',
        'mail:mailers:postmark:message_stream_id',
        'services:ses:key',
        'services:ses:secret',
        'services:ses:region',
    ];

    /**
     * Keys that are encrypted and should be decrypted when set in the
     * configuration array.
     */
    protected static array $encrypted = [
        'mail:mailers:smtp:password',
        'services:mailgun:secret',
        'services:postmark:token',
        'services:ses:key',
        'services:ses:secret',
    ];

    /**
     * Map of settings keys to their corresponding environment variable names.
     */
    protected array $environmentKeys = [
        'app:name' => ['APP_NAME'],
        'app:locale' => ['APP_LOCALE'],
        'aquadactyl:branding:logo_path' => ['AQUADACTYL_BRANDING_LOGO_PATH'],
        'aquadactyl:branding:show_name' => ['AQUADACTYL_BRANDING_SHOW_NAME'],
        'aquadactyl:features:player_counts' => ['AQUADACTYL_FEATURE_PLAYER_COUNTS'],
        'aquadactyl:features:custom_profile_pictures' => ['AQUADACTYL_FEATURE_CUSTOM_PROFILE_PICTURES'],
        'aquadactyl:features:privacy_mode' => ['AQUADACTYL_FEATURE_PRIVACY_MODE'],
        'aquadactyl:features:server_quick_actions' => ['AQUADACTYL_FEATURE_SERVER_QUICK_ACTIONS'],
        'aquadactyl:features:registration' => ['AQUADACTYL_FEATURE_REGISTRATION'],
        'recaptcha:enabled' => ['RECAPTCHA_ENABLED'],
        'recaptcha:provider' => ['RECAPTCHA_PROVIDER'],
        'recaptcha:secret_key' => ['RECAPTCHA_SECRET_KEY'],
        'recaptcha:website_key' => ['RECAPTCHA_WEBSITE_KEY'],
        'pterodactyl:guzzle:timeout' => ['GUZZLE_TIMEOUT'],
        'pterodactyl:guzzle:connect_timeout' => ['GUZZLE_CONNECT_TIMEOUT'],
        'pterodactyl:console:count' => ['CONSOLE_COUNT'],
        'pterodactyl:console:frequency' => ['CONSOLE_FREQUENCY'],
        'pterodactyl:auth:2fa_required' => ['APP_2FA_REQUIRED'],
        'pterodactyl:client_features:allocations:enabled' => ['PTERODACTYL_CLIENT_ALLOCATIONS_ENABLED'],
        'pterodactyl:client_features:allocations:range_start' => ['PTERODACTYL_CLIENT_ALLOCATIONS_RANGE_START'],
        'pterodactyl:client_features:allocations:range_end' => ['PTERODACTYL_CLIENT_ALLOCATIONS_RANGE_END'],
        'mail:mailers:smtp:host' => ['MAIL_HOST'],
        'mail:default' => ['MAIL_MAILER', 'MAIL_DRIVER'],
        'services:mailgun:domain' => ['MAILGUN_DOMAIN'],
        'services:mailgun:secret' => ['MAILGUN_SECRET'],
        'services:mailgun:endpoint' => ['MAILGUN_ENDPOINT'],
        'services:postmark:token' => ['POSTMARK_TOKEN'],
        'mail:mailers:postmark:message_stream_id' => ['POSTMARK_MESSAGE_STREAM_ID'],
        'services:ses:key' => ['AWS_ACCESS_KEY_ID'],
        'services:ses:secret' => ['AWS_SECRET_ACCESS_KEY'],
        'services:ses:region' => ['AWS_DEFAULT_REGION'],
        'mail:mailers:smtp:port' => ['MAIL_PORT'],
        'mail:mailers:smtp:encryption' => ['MAIL_ENCRYPTION'],
        'mail:mailers:smtp:username' => ['MAIL_USERNAME'],
        'mail:mailers:smtp:password' => ['MAIL_PASSWORD'],
        'mail:from:address' => ['MAIL_FROM_ADDRESS', 'MAIL_FROM'],
        'mail:from:name' => ['MAIL_FROM_NAME'],
    ];

    /**
     * Check if an environment variable is explicitly defined in the environment.
     */
    protected function hasEnvironmentVariable(string $name): bool
    {
        return array_key_exists($name, $_ENV)
            || array_key_exists($name, $_SERVER)
            || getenv($name) !== false;
    }

    /**
     * Boot the service provider.
     */
    public function boot(ConfigRepository $config, Encrypter $encrypter, Log $log, SettingsRepositoryInterface $settings): void
    {
        $keys = array_merge($this->keys, $this->emailKeys);

        try {
            $values = $settings->all()->mapWithKeys(function ($setting) {
                return [$setting->key => $setting->value];
            })->toArray();
        } catch (QueryException $exception) {
            $log->notice('A query exception was encountered while trying to load settings from the database: ' . $exception->getMessage());

            return;
        }

        foreach ($keys as $key) {
            $fromEnv = false;
            // Branding saved in the customiser must override Docker's initial
            // APP_NAME and branding defaults when database settings are enabled.
            $managed = in_array($key, array_merge($this->emailKeys, ['app:name', 'aquadactyl:branding:logo_path', 'aquadactyl:branding:show_name']), true);
            $saved = $managed && array_key_exists('settings::' . $key, $values);
            $envVars = $saved ? [] : ($this->environmentKeys[$key] ?? []);
            foreach ($envVars as $envVar) {
                if ($this->hasEnvironmentVariable($envVar)) {
                    if ($this->app->environment('testing') && in_array($envVar, ['APP_NAME', 'APP_LOCALE'], true)) {
                        continue;
                    }
                    $value = env($envVar);
                    $fromEnv = true;
                    break;
                }
            }

            if (!$fromEnv) {
                $value = array_get($values, 'settings::' . $key, $config->get(str_replace(':', '.', $key)));
                if (in_array($key, self::$encrypted) && !empty($value)) {
                    try {
                        $value = $encrypter->decrypt($value);
                    } catch (DecryptException $exception) {
                        $value = '';
                    }
                }
            }

            if (is_string($value) && $key !== 'app:name' && !in_array($key, self::$encrypted, true)) {
                switch (strtolower($value)) {
                    case 'true':
                    case '(true)':
                        $value = true;
                        break;
                    case 'false':
                    case '(false)':
                        $value = false;
                        break;
                    case 'empty':
                    case '(empty)':
                        $value = '';
                        break;
                    case 'null':
                    case '(null)':
                        $value = null;
                }
            }

            $config->set(str_replace(':', '.', $key), $value);
        }

        // Laravel's current SMTP transport reads scheme and TLS flags rather
        // than the legacy encryption field exposed by the settings form.
        $encryption = $config->get('mail.mailers.smtp.encryption');
        $config->set('mail.mailers.smtp.scheme', $encryption === 'ssl' ? 'smtps' : 'smtp');
        $config->set('mail.mailers.smtp.require_tls', $encryption === 'tls');
        $config->set('mail.mailers.smtp.auto_tls', !empty($encryption));
    }

    public static function getEncryptedKeys(): array
    {
        return self::$encrypted;
    }
}
