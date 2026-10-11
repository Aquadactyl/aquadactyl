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
        'token' => env('AQUADACTYL_TELEMETRY_TOKEN'),
    ],
];
