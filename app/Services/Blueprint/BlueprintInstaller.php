<?php

namespace Pterodactyl\Services\Blueprint;

use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Process;
use Pterodactyl\Models\BlueprintInstallation;

class BlueprintInstaller
{
    public function __construct(private BlueprintArchive $archives, private BlueprintExtensionRegistry $registry)
    {
    }

    public function runNext(): bool
    {
        return (bool) Cache::lock('blueprint-web-installer', 2100)->get(function () {
            $installation = BlueprintInstallation::where('status', 'queued')->oldest()->first();
            if (!$installation) {
                return false;
            }
            $removal = $installation->operation === 'remove';
            $installation->update(['status' => 'running', 'message' => $removal ? 'Removing extension.' : 'Installing package.']);
            $staged = base_path('.blueprint-install-' . $installation->id);
            try {
                if (!User::whereKey($installation->user_id)->where('root_admin', true)->exists()) {
                    throw new \RuntimeException('The requesting administrator no longer has permission.');
                }
                if ($removal) {
                    if (!$this->registry->installed($installation->identifier)) {
                        throw new \RuntimeException('This extension is not installed or cannot be removed.');
                    }
                    $result = Process::path(base_path())->env(['BLUEPRINT__FOLDER' => base_path()])->timeout(1800)->quietly()
                        ->run(['bash', base_path('blueprint.sh'), '-bash', '-r', $installation->identifier, '--yes']);
                    $installation->update([
                        'status' => $result->successful() ? 'completed' : 'failed',
                        'message' => $result->successful() ? 'Extension removed.' : 'Blueprint removal failed. Check the private Blueprint CLI logs before retrying.',
                    ]);

                    return true;
                }
                if ($installation->operation !== 'install') {
                    throw new \RuntimeException('Unsupported Blueprint operation.');
                }
                $path = $installation->archivePath();
                $hash = !is_link($path) && is_file($path) ? @hash_file('sha256', $path) : false;
                if (!$hash || !hash_equals($installation->sha256, $hash)) {
                    throw new \RuntimeException('The uploaded package failed its integrity check.');
                }
                $identifier = $this->archives->inspect($path);
                if ($identifier !== $installation->identifier) {
                    throw new \RuntimeException('The package identifier changed.');
                }
                $destination = base_path($identifier . '.blueprint');
                if (is_link($destination) || is_dir($destination) || (!$installation->allow_update && (file_exists($destination) || is_dir(base_path('.blueprint/extensions/' . $identifier))))) {
                    throw new \RuntimeException('This extension already exists. Confirm an update before replacing it.');
                }
                if (file_exists($staged) || is_link($staged) || !@copy($path, $staged)) {
                    throw new \RuntimeException('Could not stage the extension package.');
                }
                chmod($staged, 0600);
                if (!hash_equals($installation->sha256, hash_file('sha256', $staged)) || !rename($staged, $destination)) {
                    throw new \RuntimeException('The staged package failed its integrity check.');
                }
                // This command is deliberately separate from Laravel's general-purpose queue.
                // Only validated identifiers are passed as an argv element; no shell expansion.
                $result = Process::path(base_path())->env(['BLUEPRINT__FOLDER' => base_path()])->timeout(1800)->quietly()
                    ->run(['bash', base_path('blueprint.sh'), '-bash', '-i', $identifier]);
                $installation->update([
                    'status' => $result->successful() ? 'completed' : 'failed',
                    'message' => $result->successful() ? 'Package installed.' : 'Blueprint failed. Check the private Blueprint CLI logs before retrying.',
                ]);
            } catch (\Exception) {
                // Never publish child-process output, environment values or arbitrary exception text.
                $installation->update(['status' => 'failed', 'message' => $removal
                    ? 'Removal could not complete. Verify the extension and permissions. Check the private Blueprint CLI logs.'
                    : 'Installation could not complete. Verify the package, permissions and update confirmation. Check the private Blueprint CLI logs.']);
            } finally {
                if (is_file($staged) && !is_link($staged)) {
                    unlink($staged);
                }
                if (is_file($installation->archivePath()) && !is_link($installation->archivePath())) {
                    unlink($installation->archivePath());
                }
            }

            return true;
        });
    }
}
