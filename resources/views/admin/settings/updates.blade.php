@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'updates'])
@section('title', __('webhooks.updates'))
@section('content-header')
    <h1>{{ __('webhooks.updates') }}<small>{{ __('webhooks.updates_help') }}</small></h1>
@endsection
@section('content')
    @yield('settings::nav')
    <div class="callout callout-info"><p>{{ __('webhooks.check_help') }}</p><p>{{ __('webhooks.comparison_help') }}</p></div>
    <form method="POST" action="{{ route('admin.settings.updates.save', [], false) }}" class="box box-primary">@csrf @method('PATCH')
        <div class="box-header with-border"><h3 class="box-title">{{ __('webhooks.check_configuration') }}</h3></div><div class="box-body">
            <div class="form-group"><label for="updates-enabled">{{ __('webhooks.automatic') }}</label><select id="updates-enabled" name="enabled" class="form-control"><option value="0" @selected(!$enabled)>{{ __('integrations.disabled') }}</option><option value="1" @selected($enabled)>{{ __('integrations.enabled') }}</option></select></div>
            <p class="text-muted">{{ __('webhooks.product_help') }}</p>
            @foreach($nodes as $node)<div class="form-group"><label for="node-product-{{ $node->id }}">{{ $node->name }}</label><select id="node-product-{{ $node->id }}" name="products[{{ $node->id }}]" class="form-control"><option value="auto" @selected(($products[$node->id] ?? 'auto') === 'auto')>{{ __('webhooks.auto') }}</option><option value="wings" @selected(($products[$node->id] ?? '') === 'wings')>Wings</option><option value="manta" @selected(($products[$node->id] ?? '') === 'manta')>Manta</option></select></div>@endforeach
            <div class="form-group"><label for="updates-password">{{ __('admin/ui.your_current_password') }}</label><input id="updates-password" name="current_password" class="form-control" type="password" autocomplete="current-password" required></div>
        </div><div class="box-footer"><button type="submit" class="btn btn-primary">{{ __('integrations.save') }}</button></div>
    </form>
    <div class="box"><div class="box-header with-border"><h3 class="box-title">{{ __('webhooks.versions') }}</h3></div><div class="box-body">
        <form method="POST" action="{{ route('admin.settings.updates.check', [], false) }}">@csrf<button type="submit" class="btn btn-default"><i class="fa fa-refresh" aria-hidden="true"></i> {{ __('webhooks.check_now') }}</button></form>
        <div class="software-versions">@foreach(collect([['key' => 'panel', 'name' => config('app.name')]])->concat($nodes->map(fn ($node) => ['key' => 'node:' . $node->id, 'name' => $node->name])) as $component)
            @php($state = $states->get($component['key']))
            <article class="webhook-delivery">
                <strong>{{ $component['name'] }}</strong>
                @if($state)
                    <div>{{ ucfirst($state->product) }} &middot; {{ __('webhooks.installed') }}: <code>{{ $state->installed_version }}</code></div>
                    <div>{{ __('webhooks.latest') }}: {{ $state->latest_version ?? __('webhooks.no_release') }} @if($state->latest_version && \Pterodactyl\Services\Updates\SoftwareMonitor::newer($state->installed_version, $state->latest_version))<span class="label label-info">{{ __('webhooks.available') }}</span>@endif</div>
                    <small class="text-muted">{{ __('webhooks.checked') }}: {{ $state->checked_at?->toDateTimeString() }}</small>
                    @if($state->last_error)<p class="text-warning">{{ $state->last_error }}</p>@endif
                    @if($state->release_url)<a href="{{ $state->release_url }}" target="_blank" rel="noopener noreferrer">{{ __('webhooks.releases') }} <i class="fa fa-external-link" aria-hidden="true"></i></a>@endif
                    @if($state->product === 'panel')
                        @include('admin.partials.update-notes', ['notesHeading' => __('webhooks.update_notes'), 'notesText' => $state->installed_release['notes'] ?? '', 'notesTag' => $state->installed_release['tag'] ?? null, 'notesUrl' => ($state->installed_release['tag'] ?? null) ? $state->installed_release['url'] : null])
                        <p class="text-muted small panel-update-notes-help">{{ __('webhooks.notes_help') }}</p>
                    @elseif($state->release_notes)
                        @include('admin.partials.update-notes', ['notesHeading' => __('webhooks.latest_notes'), 'notesText' => $state->release_notes, 'notesTag' => $state->latest_version, 'notesUrl' => $state->release_url])
                    @endif
                @else
                    <p class="text-muted">{{ __('webhooks.not_checked') }}</p>
                @endif
            </article>
        @endforeach</div>
    </div></div>
@endsection
