<?php

use Illuminate\Support\Arr;
use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Queue;
use Pterodactyl\Models\ServerSubdomain;
use Pterodactyl\Models\SubdomainDomain;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($this->admin);
    $this->payload = ['domain' => 'games.example.com', 'zone_id' => str_repeat('a', 32), 'api_token' => 'private-token', 'current_password' => 'password'];
});

test('administrators can add disable and remove a domain', function () {
    $this->post('/admin/subdomains', $this->payload)->assertRedirect('/admin/subdomains');
    $domain = SubdomainDomain::firstOrFail();
    $this->get('/admin/subdomains')->assertOk()->assertSee('games.example.com')->assertDontSee('private-token');
    $this->patch('/admin/subdomains/' . $domain->id, ['enabled' => false])->assertRedirect('/admin/subdomains');
    expect($domain->fresh()->enabled)->toBeFalse();
    $this->delete('/admin/subdomains/' . $domain->id)->assertRedirect('/admin/subdomains');
    expect($domain->fresh())->toBeNull();
});

test('a valid public target override can be configured', function () {
    $this->post('/admin/subdomains', $this->payload + ['target_ip' => '1.1.1.1'])->assertRedirect();
    expect(SubdomainDomain::firstOrFail()->target_ip)->toBe('1.1.1.1');
});

test('private targets invalid domains zone ids and passwords are rejected', function (array $override) {
    $this->postJson('/admin/subdomains', array_replace($this->payload, $override))->assertUnprocessable();
})->with([[['target_ip' => '127.0.0.1']], [['domain' => '*.example.com']], [['domain' => '../example.com']], [['zone_id' => '../escape']], [['api_token' => "secret\nInjected"]], [['current_password' => 'wrong']]]);

test('a Cloudflare token can be rotated with fresh password confirmation', function () {
    $this->post('/admin/subdomains', $this->payload)->assertRedirect();
    $domain = SubdomainDomain::firstOrFail();
    $this->patch('/admin/subdomains/' . $domain->id, ['enabled' => true, 'api_token' => 'new-token', 'current_password' => 'password'])->assertRedirect();
    expect($domain->fresh()->api_token)->toBe('new-token');
});

test('active or orphaned DNS ownership blocks deleting a domain until cleanup completes', function () {
    $domain = SubdomainDomain::create(Arr::except($this->payload, ['current_password']));
    $entry = ServerSubdomain::create(['domain_id' => $domain->id, 'label' => 'orphan']);
    $this->get('/admin/subdomains')->assertOk()->assertSee('Deleted server')->assertSee('orphan.games.example.com');
    $this->delete('/admin/subdomains/' . $domain->id)->assertStatus(409);
});

test('admins can queue cleanup of an orphaned DNS record', function () {
    Queue::fake();
    $domain = SubdomainDomain::create(Arr::except($this->payload, ['current_password']));
    $entry = ServerSubdomain::create(['domain_id' => $domain->id, 'label' => 'orphan']);
    $this->delete('/admin/subdomains/records/' . $entry->id)->assertRedirect();
    expect($entry->fresh()->status)->toBe('deleting');
});

test('Cloudflare tokens are never flashed back after validation errors', function () {
    $this->withHeaders(['Accept' => 'text/html'])->post('/admin/subdomains', array_replace($this->payload, ['domain' => 'invalid']))->assertRedirect();
    expect(session()->getOldInput())->not->toHaveKeys(['api_token', 'current_password']);
});
