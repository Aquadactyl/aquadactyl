@extends('layouts.admin')
@section('title', __('admin/operations.subdomains'))
@section('content-header')
    <h1>{{ __('admin/operations.subdomains') }}<small>Cloudflare DNS</small></h1>
@endsection
@section('content')
    <div class="box box-primary"><div class="box-header with-border"><h3 class="box-title">{{ __('admin/operations.available_domains') }}</h3></div>
        <div class="box-body">
            <p>{{ __('admin/operations.subdomains_help') }}</p>
            <div class="table-responsive"><table class="table table-hover"><thead><tr><th>{{ __('admin/operations.domain') }}</th><th>{{ __('admin/operations.target_ip') }}</th><th>{{ __('admin/operations.status') }}</th><th></th></tr></thead><tbody>
            @foreach($domains as $domain)<tr><td><code>{{ $domain->domain }}</code></td><td>{{ $domain->target_ip ?: __('admin/operations.primary_allocation') }}</td><td>{{ $domain->enabled ? __('admin/ui.enabled') : __('admin/ui.disabled') }}</td><td>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <form method="POST" action="/admin/subdomains/{{ $domain->id }}">@csrf @method('PATCH')<input type="hidden" name="enabled" value="{{ $domain->enabled ? '0' : '1' }}"><button class="btn btn-default btn-sm">{{ $domain->enabled ? __('admin/operations.disable') : __('admin/operations.enable') }}</button></form>
                    <form method="POST" action="/admin/subdomains/{{ $domain->id }}">@csrf @method('DELETE')<button class="btn btn-danger btn-sm">{{ __('admin/ui.delete') }}</button></form>
                    <details><summary>{{ __('admin/operations.rotate_token') }}</summary><form method="POST" action="/admin/subdomains/{{ $domain->id }}" style="display:grid;gap:8px;margin-top:8px">@csrf @method('PATCH')<input type="hidden" name="enabled" value="{{ $domain->enabled ? '1' : '0' }}"><input aria-label="Cloudflare API Token" class="form-control" type="password" name="api_token" placeholder="Cloudflare API Token" autocomplete="off" required><input aria-label="{{ __('admin/operations.current_password') }}" class="form-control" type="password" name="current_password" placeholder="{{ __('admin/operations.current_password') }}" autocomplete="current-password" required><button class="btn btn-default btn-sm">{{ __('admin/operations.rotate_token') }}</button></form></details>
                </div>
            </td></tr>@endforeach
            </tbody></table></div>
        </div>
    </div>
    <div class="box box-default"><div class="box-header with-border"><h3 class="box-title">{{ __('admin/operations.add_domain') }}</h3></div>
        <form method="POST" action="/admin/subdomains">@csrf
            <div class="box-body"><div class="row">
                <div class="form-group col-md-6"><label for="dns-domain">{{ __('admin/operations.domain') }}</label><input id="dns-domain" class="form-control" name="domain" value="{{ old('domain') }}" placeholder="play.example.com" required></div>
                <div class="form-group col-md-6"><label for="dns-zone">Cloudflare Zone ID</label><input id="dns-zone" class="form-control" name="zone_id" value="{{ old('zone_id') }}" pattern="[a-f0-9]{32}" required></div>
                <div class="form-group col-md-6"><label for="dns-token">Cloudflare API Token (Zone / DNS / Edit)</label><input id="dns-token" class="form-control" name="api_token" type="password" autocomplete="off" required></div>
                <div class="form-group col-md-6"><label for="dns-target">{{ __('admin/operations.target_ip') }}</label><input id="dns-target" class="form-control" name="target_ip" value="{{ old('target_ip') }}" placeholder="{{ __('admin/operations.primary_allocation') }}"><p class="text-muted"><small>{{ __('admin/operations.target_ip_help') }}</small></p></div>
                <div class="form-group col-md-6"><label for="dns-password">{{ __('admin/operations.current_password') }}</label><input id="dns-password" class="form-control" name="current_password" type="password" autocomplete="current-password" required></div>
            </div></div><div class="box-footer"><button class="btn btn-primary">{{ __('admin/operations.add_domain') }}</button></div>
        </form>
    </div>
    <div class="box box-default"><div class="box-header with-border"><h3 class="box-title">{{ __('admin/operations.managed_records') }}</h3></div>
        <div class="box-body table-responsive"><table class="table table-hover"><thead><tr><th>{{ __('admin/operations.domain') }}</th><th>{{ __('admin/ui.server') }}</th><th>{{ __('admin/operations.status') }}</th><th></th></tr></thead><tbody>
            @foreach($entries as $entry)<tr><td><code>{{ $entry->hostname() }}</code></td><td>{{ $entry->server?->name ?: __('admin/operations.deleted_server') }}</td><td>{{ __('admin/operations.status_' . $entry->status) }}</td><td><form method="POST" action="/admin/subdomains/records/{{ $entry->id }}">@csrf @method('DELETE')<button class="btn btn-danger btn-sm" @disabled($entry->status === 'deleting')>{{ __('admin/ui.delete') }}</button></form></td></tr>@endforeach
        </tbody></table>{{ $entries->links() }}</div>
    </div>
@endsection
