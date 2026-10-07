<?php

namespace Pterodactyl\Tests\Unit\Blueprint;

use PHPUnit\Framework\TestCase;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\BlueprintBaseLibrary;

class SettingsSerializationTest extends TestCase
{
    private function decode(string $value): mixed
    {
        $method = new \ReflectionMethod(BlueprintBaseLibrary::class, 'decodeValue');

        return $method->invoke(new BlueprintBaseLibrary(), $value);
    }

    public function testPlainSettingsAndSerializedValuesAreBothPreserved(): void
    {
        $this->assertSame('1', $this->decode('1'));
        $this->assertSame('0', $this->decode('0'));
        $this->assertSame('example', $this->decode('example'));
        $this->assertFalse($this->decode(serialize(false)));
        $this->assertTrue($this->decode(serialize(true)));
        $this->assertSame(['one', 'two'], $this->decode(serialize(['one', 'two'])));
    }

    public function testReadingSettingsDoesNotExecuteObjectWakeup(): void
    {
        SerializationProbe::$awakened = false;
        $this->decode(serialize(new SerializationProbe()));

        $this->assertFalse(SerializationProbe::$awakened);
    }
}

class SerializationProbe
{
    public static bool $awakened = false;

    public function __wakeup(): void
    {
        self::$awakened = true;
    }
}
