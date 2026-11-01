<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Models\ActivityLog;
use Pterodactyl\Services\Activity\ActivityLogService;
use Pterodactyl\Http\Middleware\Api\AuthenticateIPAccess;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

test('API source restrictions accept matching IPv4 and IPv6 networks and reject other addresses', function (string $ip, array $networks, bool $allowed) {
    $request = Request::create('/api/client', 'GET', [], [], [], ['REMOTE_ADDR' => $ip]);
    $token = (new ApiKey())->forceFill(['allowed_ips' => $networks, 'identifier' => 'coverage-key']);
    $user = User::factory()->make(['id' => 1]);
    $user->withAccessToken($token);
    $request->setUserResolver(fn () => $user);
    $called = false;
    $next = function ($passedRequest) use ($request, &$called) {
        expect($passedRequest)->toBe($request);
        $called = true;

        return 'allowed';
    };
    if ($allowed) {
        expect((new AuthenticateIPAccess())->handle($request, $next))->toBe('allowed');
        expect($called)->toBeTrue();
    } else {
        $logger = Mockery::mock(ActivityLogService::class);
        Activity::shouldReceive('event')->once()->with('auth:ip-blocked')->andReturn($logger);
        $logger->shouldReceive('actor')->once()->with($user)->andReturnSelf();
        $logger->shouldReceive('subject')->once()->with($user, $token)->andReturnSelf();
        $logger->shouldReceive('property')->once()->with('identifier', 'coverage-key')->andReturnSelf();
        $logger->shouldReceive('log')->once()->andReturn(new ActivityLog());
        expect(fn () => (new AuthenticateIPAccess())->handle($request, $next))->toThrow(AccessDeniedHttpException::class);
        expect($called)->toBeFalse();
    }
})->with([
    ['192.0.2.50', ['192.0.2.0/24'], true],
    ['2001:db8::1', ['2001:db8::/32'], true],
    ['198.51.100.1', ['invalid-range', '192.0.2.0/24'], false],
    ['invalid-address', ['192.0.2.0/24'], false],
]);
