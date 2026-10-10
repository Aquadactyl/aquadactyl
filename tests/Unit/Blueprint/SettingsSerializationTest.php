<?php

namespace Pterodactyl\Tests\Unit\Blueprint;

use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\BlueprintBaseLibrary;

function decodeSetting(string $value): mixed
{
    $method = new \ReflectionMethod(BlueprintBaseLibrary::class, 'decodeValue');

    return $method->invoke(new BlueprintBaseLibrary(), $value);
}

test('plain settings and serialized values are both preserved', function () {
    expect(decodeSetting('1'))->toBe('1')
        ->and(decodeSetting('0'))->toBe('0')
        ->and(decodeSetting('example'))->toBe('example')
        ->and(decodeSetting(serialize(false)))->toBeFalse()
        ->and(decodeSetting(serialize(true)))->toBeTrue()
        ->and(decodeSetting(serialize(['one', 'two'])))->toBe(['one', 'two']);
});

class SerializableWakeupProbe
{
    public static bool $awakened = false;

    public function __wakeup(): void
    {
        self::$awakened = true;
    }
}

test('reading settings does not execute object wakeup', function () {
    $probe = new SerializableWakeupProbe();

    SerializableWakeupProbe::$awakened = false;
    decodeSetting(serialize($probe));

    expect(SerializableWakeupProbe::$awakened)->toBeFalse();
});
