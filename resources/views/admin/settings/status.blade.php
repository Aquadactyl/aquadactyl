@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'status'])
@section('title', __('integrations.status.heading'))
@section('content-header')
    <h1>{{ __('integrations.status.heading') }}<small>{{ __('integrations.status.admin_help') }}</small></h1>
@endsection
@section('content')
    @yield('settings::nav')
    <form method="POST" action="{{ route('admin.settings.status', [], false) }}" class="box box-primary">
        @csrf @method('PATCH')
        <div class="box-header with-border"><h3 class="box-title">{{ __('integrations.status.configuration') }}</h3></div>
        <div class="box-body">
            <div class="row">
                <div class="form-group col-sm-6"><label for="status-enabled">{{ __('integrations.enabled') }}</label><select id="status-enabled" name="enabled" class="form-control"><option value="0" @selected(!old('enabled', $enabled))>{{ __('integrations.disabled') }}</option><option value="1" @selected(old('enabled', $enabled))>{{ __('integrations.enabled') }}</option></select></div>
                <div class="form-group col-sm-6"><label for="status-visibility">{{ __('integrations.status.visibility') }}</label><select id="status-visibility" name="visibility" class="form-control"><option value="signed_in" @selected(old('visibility', $visibility) === 'signed_in')>{{ __('integrations.status.signed_in') }}</option><option value="public" @selected(old('visibility', $visibility) === 'public')>{{ __('integrations.status.public') }}</option></select></div>
            </div>
            <div class="form-group"><label for="status-title">{{ __('integrations.title') }}</label><input id="status-title" name="title" class="form-control" maxlength="120" value="{{ old('title', $statusTitle) }}" placeholder="{{ config('app.name') }}"></div>
            <div class="form-group"><label for="status-description">{{ __('integrations.description') }}</label><textarea id="status-description" name="description" class="form-control" rows="2" maxlength="1000">{{ old('description', $description) }}</textarea></div>
            <p class="text-muted">{{ __('integrations.status.privacy_help') }}</p>
            <p class="text-muted small">{{ __('integrations.status.collector_help') }} <code>php artisan p:status:collect</code></p>
        </div>
        <div class="box-footer integration-actions"><button class="btn btn-primary" type="submit">{{ __('integrations.save') }}</button>@if($enabled)<a class="btn btn-default" href="/status" target="_blank" rel="noopener">{{ __('integrations.status.open') }} <i class="fa fa-external-link" aria-hidden="true"></i></a>@endif</div>
    </form>
    <div class="box">
        <div class="box-header with-border"><h3 class="box-title">{{ __('integrations.status.components') }}</h3></div>
        <div class="box-body">
            @forelse($components as $component)
                <div class="integration-component">
                    <div><strong>{{ $component->name }}</strong><p class="text-muted small">{{ $component->node->name }} &middot; {{ $component->latestCheck?->checked_at?->diffForHumans() ?? __('integrations.status.awaiting') }}</p></div>
                    <form method="POST" action="{{ route('admin.settings.status.components', [], false) . '/' . $component->id }}">@csrf @method('DELETE')<button class="btn btn-default btn-sm" type="submit"><i class="fa fa-eye-slash" aria-hidden="true"></i> {{ __('integrations.status.unpublish') }}</button></form>
                </div>
            @empty<p class="text-muted">{{ __('integrations.status.no_components') }}</p>@endforelse
            <form method="POST" action="{{ route('admin.settings.status.components', [], false) }}">
                @csrf
                <div class="row">
                    <div class="form-group col-sm-5"><label for="status-node">{{ __('integrations.node') }}</label><select id="status-node" name="node_id" class="form-control" required>@foreach($nodes as $node)@unless($components->contains('node_id', $node->id))<option value="{{ $node->id }}">{{ $node->name }}</option>@endunless @endforeach</select></div>
                    <div class="form-group col-sm-7"><label for="status-name">{{ __('integrations.status.public_label') }}</label><input id="status-name" name="name" class="form-control" maxlength="100" required placeholder="{{ __('integrations.status.label_example') }}"></div>
                </div>
                <button class="btn btn-primary" type="submit">{{ __('integrations.status.publish') }}</button>
            </form>
        </div>
    </div>
    <div class="box">
        <div class="box-header with-border"><h3 class="box-title">{{ __('integrations.status.incidents') }}</h3></div>
        <div class="box-body">
            <p class="text-muted">{{ __('integrations.status.incident_help') }}</p>
            <form method="POST" action="{{ route('admin.settings.status.incidents', [], false) }}">
                @csrf
                @include('admin.settings.partials.incident-form', ['incident' => null])
                <button class="btn btn-primary" type="submit">{{ __('integrations.status.post_incident') }}</button>
            </form>
            @foreach($incidents as $incident)
                <details class="integration-rule"><summary><strong>{{ $incident->title }}</strong><span>{{ __('integrations.status.' . $incident->status) }}</span></summary>
                    <form method="POST" action="{{ route('admin.settings.status.incidents', [], false) . '/' . $incident->id }}">
                        @csrf @method('PATCH')
                        @include('admin.settings.partials.incident-form', ['incident' => $incident])
                        <button class="btn btn-primary" type="submit">{{ __('integrations.save') }}</button>
                    </form>
                </details>
            @endforeach
        </div>
        @if($incidents->hasPages())<div class="box-footer text-center">{{ $incidents->links() }}</div>@endif
    </div>
@endsection
