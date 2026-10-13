<?php

use Pterodactyl\Rules\Fqdn;

test('node address validation allows IPs over HTTP but requires a hostname for HTTPS', function (string $address) {
    expect(Fqdn::make('scheme')->setData(['scheme' => 'http'])->passes('fqdn', $address))->toBeTrue();
    $rule = Fqdn::make('scheme')->setData(['scheme' => 'https']);
    expect($rule->passes('fqdn', $address))->toBeFalse()->and($rule->message())->toContain('must not be an IP address');
})->with(['127.0.0.1', '::1']);

test('hostname validation accepts the hosts resolver and reports an unresolvable domain', function () {
    expect(Fqdn::make()->passes('fqdn', 'localhost'))->toBeTrue();
    $rule = Fqdn::make();
    expect($rule->passes('fqdn', 'coverage-host.invalid'))->toBeFalse()->and($rule->message())->toContain('could not be resolved');
});
