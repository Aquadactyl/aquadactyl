<?php

return [
    'maintenance' => [
        'enabled' => false,
        'message' => '',
    ],
    'blueprint' => [
        'web_install_enabled' => env('AQUADACTYL_BLUEPRINT_WEB_INSTALL_ENABLED', false),
    ],
    'branding' => [
        'logo_path' => null,
        'show_name' => false,
    ],
    'features' => [
        'player_counts' => true,
        'custom_profile_pictures' => true,
        'privacy_mode' => true,
        'server_quick_actions' => true,
        'server_folders' => true,
        'registration' => false,
        'console_log_sharing' => false,
        'file_trash' => false,
    ],
    'trash' => [
        'retention_days' => 7,
    ],
    'appearance' => [
        'primary_color' => '#237c7f',
        'login_layout' => 'center',
        'login_logo_position' => 'above',
        'login_translucency' => 0,
        'login_background_path' => null,
        'login_blur' => 0,
        'login_overlay' => 50,
        'client_background_path' => null,
        'client_blur' => 0,
        'client_overlay' => 70,
    ],
    'telemetry' => [
        'enabled' => env('AQUADACTYL_TELEMETRY_ENABLED', false),
        'endpoint' => env('AQUADACTYL_TELEMETRY_ENDPOINT', 'https://api.euphoriadevelopment.uk/telemetry/panel'),
    ],
    'debug' => [
        'endpoint' => env('AQUADACTYL_DEBUG_ENDPOINT', 'https://debug.euphoriadevelopment.uk'),
        'expires_in' => (int) env('AQUADACTYL_DEBUG_EXPIRES_IN', 86400),
        'max_bytes' => (int) env('AQUADACTYL_DEBUG_MAX_BYTES', 262144),
    ],
];
