@extends('layouts.admin')
@section('title', __('admin/management.audit_logs'))
@section('content-header')
    <h1>{{ __('admin/management.audit_logs') }}<small>{{ __('admin/management.audit_help') }}</small></h1>
    <ol class="breadcrumb"><li><a href="/admin">{{ __('admin/ui.admin') }}</a></li><li class="active">{{ __('admin/management.audit_logs') }}</li></ol>
@endsection
@section('content')
    <div class="box box-primary">
        <div class="box-body">
            <form method="GET" action="{{ route('admin.audit-logs', [], false) }}">
                <div class="row">
                    <div class="form-group col-sm-4"><label for="audit-actor">{{ __('admin/management.actor') }}</label><input id="audit-actor" name="actor" class="form-control" value="{{ $filters['actor'] ?? '' }}" maxlength="191" placeholder="{{ __('admin/management.actor_help') }}"></div>
                    <div class="form-group col-sm-4"><label for="audit-event">{{ __('admin/management.event') }}</label><input id="audit-event" name="event" class="form-control" value="{{ $filters['event'] ?? '' }}" maxlength="191" placeholder="server:power"></div>
                    <div class="form-group col-sm-4"><label for="audit-kind">{{ __('admin/management.kind') }}</label><select id="audit-kind" name="kind" class="form-control"><option value="">{{ __('admin/management.all_actions') }}</option>@foreach(['admin', 'user', 'system'] as $kind)<option value="{{ $kind }}" @selected(($filters['kind'] ?? '') === $kind)>{{ __('admin/management.kind_' . $kind) }}</option>@endforeach</select></div>
                </div>
                <div class="row">
                    <div class="form-group col-sm-4"><label for="audit-ip">{{ __('admin/ui.ip_address') }}</label><input id="audit-ip" name="ip" class="form-control" value="{{ $filters['ip'] ?? '' }}"></div>
                    <div class="form-group col-sm-4"><label for="audit-from">{{ __('admin/management.from') }}</label><input id="audit-from" name="from" type="date" class="form-control" value="{{ $filters['from'] ?? '' }}"></div>
                    <div class="form-group col-sm-4"><label for="audit-to">{{ __('admin/management.to') }}</label><input id="audit-to" name="to" type="date" class="form-control" value="{{ $filters['to'] ?? '' }}"></div>
                </div>
                <div class="audit-filter-actions"><a class="btn btn-default" href="{{ route('admin.audit-logs', [], false) }}">{{ __('admin/management.reset_filters') }}</a><button type="submit" class="btn btn-primary">{{ __('admin/management.filter') }}</button></div>
            </form>
        </div>
    </div>
    <div class="box box-default">
        <div class="box-header with-border"><h3 class="box-title">{{ __('admin/management.recorded_actions') }}</h3><p class="text-muted small">{{ __('admin/management.audit_privacy') }}</p></div>
        <div class="box-body no-padding audit-entries">
            @forelse($entries as $entry)
                @php($metadata = collect($entry->properties)->only(['method', 'route', 'status'])->map(fn ($value) => is_scalar($value) ? (string) $value : ''))
                <article class="audit-entry">
                    <div class="audit-entry-main">
                        <span class="audit-icon" aria-hidden="true"><i class="fa {{ str_starts_with($entry->event, 'admin:') ? 'fa-shield' : 'fa-history' }}"></i></span>
                        <div class="audit-entry-details"><strong>{{ $entry->event }}</strong>
                            <p class="text-muted">{{ $entry->actor instanceof \Pterodactyl\Models\User ? $entry->actor->username : __('admin/management.system_or_guest') }} <span data-sensitive>{{ $entry->ip }}</span></p>
                            @if($entry->event === 'admin:request')<code>{{ $metadata->get('method') }} {{ $metadata->get('route') }}</code><span class="label {{ (int) $metadata->get('status') >= 400 ? 'label-warning' : 'label-default' }}">{{ $metadata->get('status') }}</span>@endif
                            @if($entry->subjects->isNotEmpty())<div class="audit-subjects">@foreach($entry->subjects as $subject)<span>{{ class_basename($subject->subject_type) }} #{{ $subject->subject_id }}@if($subject->subject) &middot; {{ $subject->subject->getAttribute('name') ?? $subject->subject->getAttribute('username') ?? $subject->subject->getAttribute('short') }}@endif</span>@endforeach</div>@endif
                        </div>
                    </div>
                    <time datetime="{{ $entry->timestamp->toIso8601String() }}" title="{{ $entry->timestamp->toIso8601String() }}">{{ $entry->timestamp->toDayDateTimeString() }}</time>
                </article>
            @empty
                <div class="audit-empty"><i class="fa fa-history" aria-hidden="true"></i><h3>{{ __('admin/management.no_audit_entries') }}</h3><p class="text-muted">{{ __('admin/management.no_audit_entries_help') }}</p></div>
            @endforelse
        </div>
        @if($entries->hasPages())<div class="box-footer text-center">{{ $entries->links() }}</div>@endif
    </div>
@endsection
