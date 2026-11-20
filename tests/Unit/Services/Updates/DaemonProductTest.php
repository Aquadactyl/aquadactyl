<?php

use Pterodactyl\Services\Updates\DaemonProduct;
use Pterodactyl\Services\Updates\SoftwareVersion;

test('daemon identity keeps Wings and Manta separate without guessing ambiguous builds', function (array $info, string $override, string $expected) {
    expect(DaemonProduct::identify($info, $override))->toBe($expected);
})->with([
    [['version' => '1.1-beta.3', 'capabilities' => ['system_usage' => true]], 'auto', 'manta'],
    [['version' => 'v1.1-beta', 'capabilities' => ['system_usage' => true]], 'auto', 'manta'],
    [['version' => '1.1-beta.3'], 'auto', 'unknown'],
    [['version' => '1.1-beta.3', 'capabilities' => ['system_usage' => false]], 'auto', 'unknown'],
    [['version' => '1.1-beta.3', 'capabilities' => ['system_usage' => 'true']], 'auto', 'unknown'],
    [['version' => '1.13.5'], 'auto', 'wings'],
    [['version' => 'v1.14.0-rc.1'], 'auto', 'wings'],
    [['version' => '1.13.5', 'capabilities' => ['system_usage' => true]], 'auto', 'wings'],
    [['version' => '1.2.3-manta'], 'auto', 'manta'],
    [['version' => 'manta 1.1-beta.3'], 'auto', 'manta'],
    [['version' => 'develop'], 'auto', 'unknown'],
    [['version' => []], 'auto', 'unknown'],
    [[], 'auto', 'unknown'],
    [['version' => '1.13.5', 'product' => ' Manta '], 'auto', 'manta'],
    [['version' => '1.1-beta.3', 'product' => 'wings', 'capabilities' => ['system_usage' => true]], 'auto', 'wings'],
    [['version' => '1.13.5', 'product' => 'other'], 'auto', 'unknown'],
    [['version' => '1.13.5', 'product' => []], 'auto', 'unknown'],
    [['version' => '1.13.5', 'product' => null], 'auto', 'unknown'],
    [['version' => 'custom', 'product' => 'wings'], 'manta', 'manta'],
    [['version' => 'custom', 'product' => 'manta'], 'wings', 'wings'],
]);

test('release comparisons normalize version prefixes missing patch numbers and beta identifiers', function (string $installed, string $latest, bool $expected) {
    expect(SoftwareVersion::newer($installed, $latest))->toBe($expected);
})->with([
    ['1.1-beta.3', 'v1.1-beta.4', true],
    ['1.1-beta.4', 'v1.1-beta.3', false],
    ['1.1-beta.9', 'v1.1-beta.10', true],
    ['1.1-beta.3', 'v1.1.0-beta.3', false],
    ['1.1-beta', 'v1.1-beta.1', true],
    ['1.1.0-beta.4', 'v1.1.0-rc.1', true],
    ['1.1.0-rc.1', 'v1.1.0', true],
    ['1.1.0', 'v1.1.0-beta.9', false],
    ['1.1.0', 'v1.2.0-beta.1', true],
    ['v1.13.4', '1.13.5', true],
    ['1.1.0+abc', '1.1.0+def', false],
    ['canary+abcdef012345', '1.1.0', false],
    ['custom', '1.1.0', false],
    ['1.1.0', 'develop', false],
    ['01.1.0', '1.1.0', false],
    [str_repeat('1', 101), '1.1.0', false],
]);

test('only recognized prereleases opt into prerelease feeds', function (string $version, bool $expected) {
    expect(SoftwareVersion::isPrerelease($version))->toBe($expected);
})->with([['1.1-beta.3', true], ['v1.1.0-RC1+build.1', true], ['1.1-alpha', true], ['1.13.5', false], ['1.2.3-manta', false], ['custom', false]]);
