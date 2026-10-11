<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Console\Kernel;
use Pterodactyl\Notifications\MailTested;
use Illuminate\Support\Facades\Notification;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Contracts\Encryption\Encrypter;
use Pterodactyl\Providers\SettingsServiceProvider;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Http\Requests\Admin\Settings\MailSettingsFormRequest;

class MailController extends Controller
{
    /**
     * MailController constructor.
     */
    public function __construct(
        private ConfigRepository $config,
        private Encrypter $encrypter,
        private Kernel $kernel,
        private SettingsRepositoryInterface $settings,
    ) {
    }

    /**
     * Render SMTP and supported API mail services without exposing credentials.
     */
    public function index(): View
    {
        return view('admin.settings.mail', [
            'disabled' => (bool) $this->config->get('pterodactyl.load_environment_only', false),
            'drivers' => ['smtp' => 'SMTP', 'mailgun' => 'Mailgun', 'postmark' => 'Postmark', 'ses' => 'Amazon SES', 'log' => __('admin/custom.mail_log')],
        ]);
    }

    /**
     * Handle request to update SMTP mail settings.
     *
     * @throws DisplayException
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function update(MailSettingsFormRequest $request): Response
    {
        if ($this->config->get('pterodactyl.load_environment_only', false)) {
            throw new DisplayException(__('admin/custom.environment_only'));
        }

        $values = $request->normalize();
        if (array_get($values, 'mail:mailers:smtp:password') === '!e') {
            $values['mail:mailers:smtp:password'] = '';
        }

        DB::transaction(function () use ($values) {
            foreach ($values as $key => $value) {
                if (in_array($key, SettingsServiceProvider::getEncryptedKeys()) && $value !== null && $value !== '') {
                    $value = $this->encrypter->encrypt($value);
                }

                $this->settings->set('settings::' . $key, $value);
            }
        });

        $this->kernel->call('queue:restart');

        return response('', 204);
    }

    /**
     * Submit a request to send a test mail message.
     */
    public function test(Request $request): Response
    {
        try {
            Notification::route('mail', $request->user()->email)
                ->notify(new MailTested($request->user()));
        } catch (\Exception $exception) {
            // Provider errors can contain API tokens, URLs or SMTP credentials.
            Log::warning('The administrator mail test failed.', ['exception_type' => get_class($exception)]);

            return response()->json(['error' => __('admin/custom.mail_test_failed')], 500);
        }

        return response('', 204);
    }
}
