<?php

namespace Pterodactyl\Tests\Integration\Blueprint;

use Pterodactyl\Tests\Integration\IntegrationTestCase;

class ExtensionAccessTest extends IntegrationTestCase
{
    public function testBlueprintClientEndpointsRequireAuthentication(): void
    {
        $this->getJson('/api/client/extensions/blueprint/eggs?id=blueprint')->assertUnauthorized();
    }

    public function testBlueprintAdminPagesDenyUnauthenticatedAccess(): void
    {
        $this->get('/admin/extensions')->assertForbidden();
    }

    public function testCoreAuthenticationPageKeepsSecurityHeaders(): void
    {
        $this->get('/auth/login')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
}
