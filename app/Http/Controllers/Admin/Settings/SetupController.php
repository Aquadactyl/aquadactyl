<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Location;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Illuminate\Contracts\Console\Kernel;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Settings\SiteLogoService;
use Pterodactyl\Services\Users\UserCreationService;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Pterodactyl\Http\Requests\Admin\Settings\UpdateLogoRequest;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

class SetupController extends Controller
{
    public function index(Request $request): View
    {
        $step = $request->query('step', 'branding');
        abort_unless(in_array($step, ['branding', 'node', 'admins', 'finish'], true), 404);

        return view('admin.settings.setup', [
            'step' => $step,
            'disabled' => (bool) config('pterodactyl.load_environment_only', false),
            'locations' => Location::query()->orderBy('short')->get(),
            'nodes' => Node::query()->orderByDesc('id')->get(),
            'admins' => User::query()->where('root_admin', true)->orderBy('id')->get(['id', 'username', 'email']),
        ]);
    }

    public function branding(Request $request, SettingsRepositoryInterface $settings, SiteLogoService $logos, Kernel $kernel): RedirectResponse
    {
        $this->ensureEditable();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'primary_color' => ['required', 'string', 'regex:/\A#[a-f0-9]{6}\z/i'],
            'logo' => ['nullable', ...array_diff((new UpdateLogoRequest())->rules()['logo'], ['required'])],
        ]);
        // A file is optional, but uses the same validation and image re-encoding as Appearance.
        if ($request->hasFile('logo')) {
            $logos->upload($request->file('logo'));
        }
        DB::transaction(function () use ($settings, $data) {
            $settings->set('settings::app:name', $data['name']);
            $settings->set('settings::aquadactyl:appearance:primary_color', strtolower($data['primary_color']));
        });
        $kernel->call('queue:restart');

        return new RedirectResponse(route('admin.settings.setup', ['step' => 'node'], false));
    }

    public function testNode(Node $node, DaemonConfigurationRepository $daemon): JsonResponse
    {
        try {
            $info = $daemon->setNode($node)->getSystemInformation();
            if (!is_string($info['version'] ?? null) || $info['version'] === '') {
                throw ValidationException::withMessages(['node' => __('setup.connection_failed')]);
            }

            return response()->json(['connected' => true, 'message' => __('setup.connected'), 'version' => mb_substr($info['version'], 0, 100)]);
        } catch (DaemonConnectionException $exception) {
            // Never return daemon credentials, raw HTTP bodies, or internal exception messages.
            return response()->json(['connected' => false, 'message' => __('setup.connection_failed')], 422);
        }
    }

    public function administrator(Request $request, UserCreationService $users, ConfirmAccountPassword $confirmation): RedirectResponse
    {
        $rules = collect(User::getRules())->only(['email', 'username', 'name_first', 'name_last'])->all();
        $data = $request->validate($rules + ['password' => ['required', 'string', 'min:8', 'max:72', 'confirmed']]);
        $confirmation->handle($request);
        $users->handle($data + ['root_admin' => true, 'language' => config('app.locale', 'en')]);

        return new RedirectResponse(route('admin.settings.setup', ['step' => 'admins'], false));
    }

    public function complete(SettingsRepositoryInterface $settings): RedirectResponse
    {
        $settings->set('settings::aquadactyl:setup:completed', 'true');
        Activity::event('admin:setup.completed')->log();

        return new RedirectResponse(route('admin.index', [], false));
    }

    private function ensureEditable(): void
    {
        if (config('pterodactyl.load_environment_only', false)) {
            throw new DisplayException(__('admin/custom.environment_only'));
        }
    }
}
