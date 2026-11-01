<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Pterodactyl\Http\Controllers\Controller;

class BaseController extends Controller
{
    /**
     * Return the admin index view.
     */
    public function index(\Pterodactyl\Services\Updates\ReleaseNotes $notes): View
    {
        $version = $notes->installedVersion();

        return view('admin.index', ['installedVersion' => $version,
            'panelUpdate' => \Pterodactyl\Models\SoftwareUpdate::where('component', 'panel')->where('installed_version', $version)->first()]);
    }
}
