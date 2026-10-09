<?php

namespace Pterodactyl\Tests\Fixtures;

class EggDownloadFixture
{
    public static function document(): array
    {
        return [
            'meta' => ['slug' => 'library-test', 'source' => 'pterodactyl', 'category' => 'testing', 'owner' => 'pterodactyl', 'repo' => 'game-eggs'],
            'readme' => 'Test setup notes.',
            'egg' => [
                'meta' => ['version' => 'PTDL_v2'],
                'name' => 'Library Test Egg',
                'author' => 'library@example.com',
                'description' => 'An egg for testing imports.',
                'features' => [],
                'docker_images' => ['Test image' => 'example/library:latest'],
                'file_denylist' => [],
                'startup' => 'echo {{LIBRARY_TEST_VALUE}}',
                'config' => ['files' => '{}', 'startup' => '{"done":"Ready"}', 'logs' => '{}', 'stop' => 'stop'],
                'scripts' => ['installation' => ['script' => 'echo library-preview', 'container' => 'alpine:latest', 'entrypoint' => 'bash']],
                'variables' => [[
                    'name' => 'Test value', 'description' => 'An imported variable.', 'env_variable' => 'LIBRARY_TEST_VALUE',
                    'default_value' => 'example', 'user_viewable' => true, 'user_editable' => true,
                    'rules' => 'required|string|max:255', 'field_type' => 'text',
                ]],
            ],
        ];
    }

    public static function catalog(): array
    {
        return [
            ['slug' => 'library-test', 'name' => 'Library Test Egg', 'category' => 'testing', 'repo' => 'game-eggs', 'source' => 'pterodactyl'],
            ['slug' => 'node-generic', 'name' => 'Node.js Generic', 'category' => 'nodejs', 'repo' => 'generic-eggs', 'source' => 'pterodactyl'],
            ['slug' => 'pelican-test', 'name' => 'Pelican Test', 'category' => 'testing', 'repo' => 'generic', 'source' => 'pelican'],
        ];
    }
}
