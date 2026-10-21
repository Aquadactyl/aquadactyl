<?php

return [
    'title' => 'Progressive web app (PWA)',
    'description' => 'Choose whether users can install this panel as an app and see an offline connection page.',
    'enabled' => 'App installation',
    'enabled_help' => 'Advertise the app manifest and browser installation controls.',
    'offline' => 'Offline connection page',
    'offline_help' => 'Store only a public connection page. Account data, console logs and server files are never stored for offline use. Requires app installation to be enabled.',
    'on' => 'Enabled',
    'off' => 'Disabled',
    'app_name' => 'App name',
    'name_help' => 'Optional. Leave empty to use the site name from Appearance.',
    'short_name' => 'Short app name',
    'short_help' => 'Optional. Up to 30 characters for home-screen shortcuts; defaults to the app name.',
    'branding_help' => 'App icons and the theme colour follow your panel branding.',
    'install_help' => 'Installation requires HTTPS outside localhost. Use Install app in Chrome or Edge, or Share → Add to Home Screen in Safari. Server management always requires a connection.',
    'disable_help' => 'Disabling the app removes installation controls and retires this panel’s offline worker and cache when users reconnect or reload. Disabling only the offline page keeps app installation available. Existing home-screen shortcuts cannot be removed remotely.',
    'saved' => 'PWA settings saved.',
];
