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
        return view('admin.index', ['installedVersion' => $notes->installedVersion(), 'installedNotes' => $notes->installed(),
            'panelUpdate' => \Pterodactyl\Models\SoftwareUpdate::where('component', 'panel')->first()]);
    }
}
