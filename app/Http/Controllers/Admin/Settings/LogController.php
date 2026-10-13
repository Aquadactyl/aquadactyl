<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Helpers\LogViewerService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LogController extends Controller
{
    public function __construct(
        private LogViewerService $logViewer,
        private AlertsMessageBag $alert,
    ) {
    }

    /**
     * Render the Laravel log viewer in the Admin settings area.
     */
    public function index(Request $request): View
    {
        $files = $this->logViewer->getLogFiles();
        $selectedFile = $request->query('file');

        // Verify if selected file actually exists in the discovered list
        $matchedFile = null;
        if ($selectedFile !== null) {
            foreach ($files as $file) {
                if ($file['name'] === $selectedFile) {
                    $matchedFile = $file;
                    break;
                }
            }
        }

        if ($matchedFile === null && !empty($files)) {
            $matchedFile = $files[0];
            $selectedFile = $matchedFile['name'];
        }

        $content = $selectedFile !== null
            ? $this->logViewer->getLogContent($selectedFile)
            : '';

        return view('admin.settings.logs', [
            'files' => $files,
            'currentFile' => $matchedFile,
            'content' => $content,
            'raw' => $content,
        ]);
    }

    /**
     * Download a log file directly.
     */
    public function download(string $file): BinaryFileResponse|RedirectResponse
    {
        $path = $this->logViewer->getLogPath($file);
        if ($path === null) {
            $this->alert->danger('The requested log file does not exist.')->flash();

            return new RedirectResponse(route('admin.settings.logs', [], false));
        }

        return response()->download($path, basename($file), [
            'Content-Type' => 'text/plain',
        ]);
    }

    /**
     * Delete a log file.
     */
    public function delete(string $file): RedirectResponse
    {
        if ($this->logViewer->deleteLog($file)) {
            $this->alert->success(trans('admin/custom.log_cleared'))->flash();
        } else {
            $this->alert->danger('Could not delete the requested log file.')->flash();
        }

        return new RedirectResponse(route('admin.settings.logs', [], false));
    }
}
