<?php

namespace Pterodactyl\Tests\Unit\Http\Middleware;

use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Response;
use Pterodactyl\Http\Middleware\SetSecurityHeaders;

class SetSecurityHeadersTest extends TestCase
{
    public function testOnlyAuthenticatedAdminsCanRequestADashboardPreview(): void
    {
        foreach ([
            ['/?theme-preview=1', true, 'SAMEORIGIN'],
            ['/?theme-preview=1', false, 'DENY'],
            ['/?theme-preview=1', null, 'DENY'],
            ['/', true, 'DENY'],
            ['/account?theme-preview=1', true, 'DENY'],
            ['/auth/login?theme-preview=1', true, 'DENY'],
            ['/?theme-preview=0', true, 'DENY'],
        ] as [$uri, $admin, $expected]) {
            $request = Request::create($uri);
            $request->setUserResolver(fn () => is_null($admin) ? null : (object) ['root_admin' => $admin]);
            $response = (new SetSecurityHeaders())->handle($request, fn () => new Response('page'));
            $this->assertSame($expected, $response->headers->get('X-Frame-Options'), $uri);
            $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        }
    }

    public function testAnExistingFramePolicyIsPreserved(): void
    {
        $request = Request::create('/?theme-preview=1');
        $request->setUserResolver(fn () => (object) ['root_admin' => true]);
        $response = (new SetSecurityHeaders())->handle($request, fn () => new Response('page', 200, ['X-Frame-Options' => 'DENY']));
        $this->assertSame('DENY', $response->headers->get('X-Frame-Options'));
    }
}
