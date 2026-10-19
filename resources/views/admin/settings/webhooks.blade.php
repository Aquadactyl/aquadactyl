@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'webhooks'])
@section('title', __('webhooks.heading'))
@section('content-header')
    <h1>{{ __('webhooks.heading') }}<small>{{ __('webhooks.help') }}</small></h1>
@endsection
@section('content')
    @yield('settings::nav')
    <div class="callout callout-info"><p>{{ __('webhooks.privacy') }}</p><p>{{ __('webhooks.delivery_help') }}</p></div>
    <div class="box"><div class="box-header with-border"><h3 class="box-title">{{ __('webhooks.endpoints') }}</h3></div><div class="box-body">
        @forelse($endpoints as $endpoint)
            <details class="integration-rule"><summary><strong>{{ $endpoint->name }}</strong><span>{{ strtoupper($endpoint->format) }} &middot; {{ $endpoint->enabled ? __('integrations.enabled') : __('integrations.disabled') }}</span></summary>
                <form method="POST" action="{{ route('admin.settings.webhooks.action', $endpoint, false) }}" autocomplete="off">
                    @csrf
                    @include('admin.settings.partials.webhook-endpoint')
                    <div class="webhook-actions"><button class="btn btn-primary" type="submit" name="operation" value="save">{{ __('integrations.save') }}</button><button class="btn btn-default" type="submit" name="operation" value="test" formnovalidate>{{ __('webhooks.test') }}</button><button class="btn btn-danger" type="submit" name="operation" value="delete" formnovalidate>{{ __('webhooks.delete') }}</button></div>
                </form>
            </details>
        @empty<p class="text-muted">{{ __('webhooks.empty') }}</p>@endforelse
        <h4>{{ __('webhooks.add') }}</h4>
        <form method="POST" action="{{ route('admin.settings.webhooks.store', [], false) }}" autocomplete="off">@csrf @include('admin.settings.partials.webhook-endpoint', ['endpoint' => null])<button class="btn btn-primary" type="submit">{{ __('webhooks.add') }}</button></form>
    </div></div>
    <div class="box"><div class="box-header with-border"><h3 class="box-title">{{ __('webhooks.history') }}</h3></div><div class="box-body">
        <div class="webhook-history">@forelse($deliveries as $delivery)<article class="webhook-delivery"><div><strong>{{ $delivery->endpoint?->name }}</strong><code>{{ $delivery->event_type }}</code><small class="text-muted">{{ $delivery->created_at->toDateTimeString() }} &middot; {{ $delivery->uuid }}</small></div><div><span class="label label-{{ $delivery->status === 'succeeded' ? 'success' : ($delivery->status === 'failed' ? 'danger' : 'default') }}">{{ __('webhooks.states.' . $delivery->status) }}</span><span>{{ __('webhooks.attempts', ['count' => $delivery->attempts]) }}@if($delivery->last_status) &middot; HTTP {{ $delivery->last_status }}@endif</span></div>@if($delivery->last_error)<p class="text-muted small">{{ $delivery->last_error }}</p>@endif</article>@empty<p class="text-muted">{{ __('webhooks.no_history') }}</p>@endforelse</div>
        {{ $deliveries->links() }}
        @if($retryable->isNotEmpty())<hr><form method="POST" action="{{ route('admin.settings.webhooks.retry', [], false) }}">@csrf<div class="row"><div class="form-group col-sm-6"><label for="retry-delivery">{{ __('webhooks.retry') }}</label><select id="retry-delivery" name="delivery_id" class="form-control">@foreach($retryable as $failed)<option value="{{ $failed->id }}">#{{ $failed->id }} &middot; {{ $failed->event_type }}</option>@endforeach</select></div><div class="form-group col-sm-6"><label for="retry-password">{{ __('admin/ui.your_current_password') }}</label><input id="retry-password" type="password" name="current_password" class="form-control" autocomplete="current-password" required></div></div><button type="submit" class="btn btn-default">{{ __('webhooks.retry') }}</button></form>@endif
    </div></div>
@endsection
