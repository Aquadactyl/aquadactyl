<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\ServerSubdomain;
use Pterodactyl\Models\SubdomainDomain;
use Pterodactyl\Jobs\SyncServerSubdomain;
use Pterodactyl\Services\Subdomains\CloudflareDns;
use Pterodactyl\Services\Subdomains\SubdomainService;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->server = $this->createServerModel();
    $this->server->allocation->update(['ip' => '8.8.8.8']);
    $this->domain = SubdomainDomain::create(['domain' => 'games.example.com', 'zone_id' => str_repeat('a', 32), 'api_token' => 'test-token']);
    $this->entry = ServerSubdomain::create(['server_id' => $this->server->id, 'domain_id' => $this->domain->id, 'label' => 'minecraft', 'minecraft_srv' => true]);
    $this->dnsRecords = [];
    $this->failDns = false;
    $this->loseCreateResponse = false;
    Http::preventStrayRequests();
    Http::fake(function ($request) {
        expect($request->url())->toStartWith('https://api.cloudflare.com/client/v4/zones/' . str_repeat('a', 32) . '/dns_records');
        expect($request->header('Authorization'))->toBe(['Bearer test-token']);
        if ($this->failDns) {
            return Http::response(['success' => false], 403);
        }
        $id = basename(parse_url($request->url(), PHP_URL_PATH));
        $result = [];
        if ($request->method() === 'GET') {
            $result = array_values(array_filter($this->dnsRecords, fn ($record) => $record['name'] === $request['name'] && $record['type'] === $request['type']));
        } elseif ($request->method() === 'POST') {
            $id = (string) (count($this->dnsRecords) + 1);
            $result = $this->dnsRecords[$id] = $request->data() + ['id' => $id];
            if ($this->loseCreateResponse) {
                $this->loseCreateResponse = false;

                return Http::response(['success' => false], 502);
            }
        } elseif ($request->method() === 'PUT') {
            $result = $this->dnsRecords[$id] = $request->data() + ['id' => $id];
        } elseif ($request->method() === 'DELETE') {
            unset($this->dnsRecords[$id]);
        }

        return Http::response(['success' => true, 'result' => $result]);
    });
});

test('subdomain tokens are encrypted and excluded from serialized models', function () {
    expect($this->domain->fresh()->api_token)->toBe('test-token')->and($this->domain->toArray())->not->toHaveKeys(['api_token', 'zone_id']);
    expect(DB::table('subdomain_domains')->where('id', $this->domain->id)->value('api_token'))->not->toBe('test-token');
});

test('subdomain provisioning creates DNS-only address and Minecraft SRV records', function () {
    (new SyncServerSubdomain($this->entry->id))->handle(app(SubdomainService::class));
    $entry = $this->entry->fresh();
    expect($entry->status)->toBe('active')->and($entry->records)->toHaveKeys(['address', 'srv']);
    $records = array_values($this->dnsRecords);
    expect($records[0])->toMatchArray(['name' => 'minecraft.games.example.com', 'type' => 'A', 'content' => '8.8.8.8', 'proxied' => false])
        ->and($records[1]['data'])->toMatchArray(['port' => $this->server->allocation->port, 'target' => 'minecraft.games.example.com']);
    $requests = count(Http::recorded());
    app(SubdomainService::class)->sync($entry->id);
    expect(count(Http::recorded()))->toBe($requests);
});

test('subdomains follow allocation IP family and port changes without leaving stale records', function () {
    app(SubdomainService::class)->sync($this->entry->id);
    $this->server->allocation->update(['ip' => '2606:4700:4700::1111', 'port' => 25590]);
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh()->synced_target)->toBe('2606:4700:4700::1111:25590')
        ->and(array_column($this->dnsRecords, 'type'))->toContain('AAAA')->not->toContain('A');
    $srv = collect($this->dnsRecords)->firstWhere('type', 'SRV');
    expect($srv['data']['port'])->toBe(25590);
});

test('a public IP override works for private primary allocations without requiring SRV', function () {
    $this->domain->update(['target_ip' => '1.1.1.1']);
    $this->entry->update(['minecraft_srv' => false]);
    $this->server->allocation->update(['ip' => '192.168.1.10']);
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh()->status)->toBe('active')->and(array_values($this->dnsRecords)[0]['content'])->toBe('1.1.1.1')->and($this->dnsRecords)->toHaveCount(1);
});

test('private IPs fail safely without leaking credentials or creating DNS records', function () {
    $this->server->allocation->update(['ip' => '127.0.0.1']);
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh()->status)->toBe('error');
    Http::assertNothingSent();
});

test('records outside panel ownership are never overwritten or deleted', function () {
    $this->dnsRecords['foreign'] = ['id' => 'foreign', 'type' => 'A', 'name' => 'minecraft.games.example.com', 'content' => '9.9.9.9', 'comment' => 'Somebody else'];
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh()->status)->toBe('error')->and($this->dnsRecords['foreign']['content'])->toBe('9.9.9.9');
    $this->entry->update(['status' => 'deleting']);
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh())->toBeNull()->and($this->dnsRecords)->toHaveKey('foreign');
});

test('DNS failures retry safely and cleanup remains durable after a failed deletion', function () {
    $this->failDns = true;
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh()->status)->toBe('error');
    $this->failDns = false;
    $this->artisan('p:subdomains:sync')->assertSuccessful();
    expect($this->entry->fresh()->status)->toBe('active');
    $this->entry->update(['status' => 'deleting']);
    $this->failDns = true;
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh()->status)->toBe('deleting');
    $this->failDns = false;
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh())->toBeNull()->and($this->dnsRecords)->toBe([]);
});

test('a lost create response is recovered by DNS ownership without creating duplicate records', function () {
    $this->loseCreateResponse = true;
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh()->status)->toBe('error')->and($this->dnsRecords)->toHaveCount(1);
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh()->status)->toBe('active')->and($this->dnsRecords)->toHaveCount(2);
});

test('deleted server records survive long enough for DNS cleanup', function () {
    app(SubdomainService::class)->sync($this->entry->id);
    $this->server->delete();
    expect($this->entry->fresh()->server_id)->toBeNull();
    app(SubdomainService::class)->sync($this->entry->id);
    expect($this->entry->fresh())->toBeNull()->and($this->dnsRecords)->toBe([]);
    app(SubdomainService::class)->sync($this->entry->id);
});

test('simultaneous synchronizations use a per-record lock', function () {
    $lock = Cache::lock('subdomain:' . $this->entry->id, 120);
    $lock->get();
    try {
        app(SubdomainService::class)->sync($this->entry->id);
        Http::assertNothingSent();
    } finally {
        $lock->release();
    }
});

test('repeated Cloudflare deletes tolerate a 404', function () {
    Http::swap(new Illuminate\Http\Client\Factory());
    Http::fake(['*' => Http::response([], 404)]);
    expect(app(CloudflareDns::class)->request($this->domain, 'DELETE', '/dns_records/already-deleted'))->toBe([]);
});
