<?php

return [
    'enabled' => env('GAME_QUERY_ENABLED', true),
    'node_binary' => env('GAME_QUERY_NODE_BINARY', 'node'),
    'local_container_queries' => env('AQUADACTYL_LOCAL_SETUP', false),
    'cache_seconds' => 30,
    'games' => [
        'protocol-minecraftvanilla' => 'Minecraft Java',
        'protocol-minecraftbedrock' => 'Minecraft Bedrock',
        'protocol-valve' => 'Steam / Source (A2S)',
        'counterstrike2' => 'Counter-Strike 2',
        'csgo' => 'Counter-Strike: Global Offensive',
        'css' => 'Counter-Strike: Source',
        'garrysmod' => "Garry's Mod",
        'teamfortress2' => 'Team Fortress 2',
        'l4d2' => 'Left 4 Dead 2',
        'rust' => 'Rust',
        'valheim' => 'Valheim',
        'ase' => 'ARK: Survival Evolved',
        'dayz' => 'DayZ',
        'unturned' => 'Unturned',
        'insurgency' => 'Insurgency',
        'insurgencysandstorm' => 'Insurgency: Sandstorm',
    ],
];
