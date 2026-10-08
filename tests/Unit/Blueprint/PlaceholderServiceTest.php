<?php

namespace Pterodactyl\Tests\Unit\Blueprint;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;
use Pterodactyl\BlueprintFramework\Services\PlaceholderService\BlueprintPlaceholderService;

class PlaceholderServiceTest extends TestCase
{
    public function testUninstalledVersionIsUnknown(): void
    {
        $service = new BlueprintPlaceholderService();

        $this->assertSame('unknown', $service->version());
        $this->assertSame('NOTINSTALLED', $service->installed());
    }

    public static function installedVersions(): array
    {
        return [['beta-2026-08'], ['beta-2026-10'], ['rolling']];
    }

    #[DataProvider('installedVersions')]
    public function testInstallerReplacementPreservesTheInstalledVersion(string $version): void
    {
        $source = file_get_contents(dirname(__DIR__, 3) . '/app/BlueprintFramework/Services/PlaceholderService/BlueprintPlaceholderService.php');
        $className = 'InstalledBlueprintPlaceholderService_' . md5($version);
        // Apply the same global replacements made by blueprint.sh during setup.
        $source = str_replace(['::v', 'NOTINSTALLED', 'class BlueprintPlaceholderService'], [$version, 'INSTALLED', 'class ' . $className], $source);
        $path = tempnam(sys_get_temp_dir(), 'aquadactyl-blueprint-');

        try {
            file_put_contents($path, $source);
            require $path;
            $class = 'Pterodactyl\\BlueprintFramework\\Services\\PlaceholderService\\' . $className;
            $service = new $class();

            $this->assertSame($version, $service->version());
            $this->assertSame('INSTALLED', $service->installed());
        } finally {
            unlink($path);
        }
    }
}
