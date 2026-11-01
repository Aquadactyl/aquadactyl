<?php

use Pterodactyl\Services\Webhooks\WebhookTarget;

test('webhook URLs reject insecure ambiguous and unsupported destinations', function (string $url, string $format) {
    expect(fn () => (new WebhookTarget())->validate($url, $format))->toThrow(InvalidArgumentException::class);
})->with([
    ['', 'json'], ['http://example.com', 'json'], ['https://user:pass@example.com', 'json'], ['https://example.com/#fragment', 'json'], ['https://example.com:8443/', 'json'], ["https://example.com/\n", 'json'], ['https://localhost', 'json'], ['https://example.com.', 'json'], ['https://bad_host.example.com', 'json'], ['https://example.com/' . str_repeat('a', 2048), 'json'],
    ['https://example.com/api/webhooks/123/token', 'discord'], ['https://discord.com/not-webhooks', 'discord'], ['https://discord.com/api/webhooks/123/token?other=value', 'discord'], ['https://discord.com/api/webhooks/123/token?thread_id[]=123', 'discord'], ['https://discord.com/api/webhooks/123/token?thread_id=bad', 'discord'],
]);

test('Discord URLs enforce confirmed delivery and preserve valid thread routing', function () {
    $target = new WebhookTarget();
    expect($target->validate('https://discord.com/api/v10/webhooks/123/token?wait=false&thread_id=456', 'discord')['url'])->toBe('https://discord.com/api/v10/webhooks/123/token?wait=true&thread_id=456');
    expect($target->validate('https://hooks.example.com/path?key=value', 'json'))->toBe(['url' => 'https://hooks.example.com/path?key=value', 'host' => 'hooks.example.com']);
});

test('all resolved addresses must be public preventing private redirects and DNS rebinding', function (array $addresses, bool $valid) {
    $target = new class($addresses) extends WebhookTarget {
        public function __construct(private array $ips)
        {
        }

        protected function addresses(string $host): array
        {
            return $this->ips;
        }
    };
    if ($valid) {
        expect($target->resolve('https://hooks.example.com/', 'json')['ip'])->toBe($addresses[0]);
    } else {
        expect(fn () => $target->resolve('https://hooks.example.com/', 'json'))->toThrow(RuntimeException::class);
    }
})->with([
    [[], false], [['1.1.1.1'], true], [['2606:4700:4700::1111'], true], [['127.0.0.1'], false], [['10.0.0.1'], false], [['169.254.169.254'], false], [['100.64.0.1'], false], [['::1'], false], [['::ffff:127.0.0.1'], false], [['224.0.0.1'], false], [['invalid'], false], [['1.1.1.1', '192.168.1.1'], false],
]);

test('DNS adapter handles failed local lookups without performing HTTP requests', function () {
    $target = new class extends WebhookTarget {
        public function lookup(string $host): array
        {
            return $this->addresses($host);
        }
    };
    expect($target->lookup('localhost'))->toBeArray()->and($target->lookup('invalid.test.invalid'))->toBe([]);
});
