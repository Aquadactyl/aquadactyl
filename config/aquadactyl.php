<?php

return [
    'branding' => [
        'logo_path' => null,
        'show_name' => false,
    ],
    'features' => [
        'player_counts' => true,
        'custom_profile_pictures' => true,
        'privacy_mode' => true,
        'server_quick_actions' => true,
        'registration' => false,
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
