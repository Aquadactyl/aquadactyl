@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.administration') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.administrative_overview') }}<small>{{ __('admin/ui.a_quick_glance_at_your_system') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/ui.index') }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-info">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.system_information') }}</h3>
            </div>
            <div class="box-body">
                {{ __('admin/ui.you_are_running_aquadactyl_panel_version') }} <code>{{ $installedVersion }}</code>{{ __('admin/ui.check') }} <a href="https://github.com/Aquadactyl/aquadactyl/releases" target="_blank" rel="noopener noreferrer">{{ __('admin/ui.aquadactyl_releases') }}</a>
                {{ __('admin/ui.for_updates_and_follow_the') }} <a href="https://aquadactyl.uk/docs/updating">{{ __('admin/ui.update_guide') }}</a>.
                @include('admin.partials.update-notes', ['notesHeading' => __('webhooks.update_notes'), 'notesText' => $panelUpdate?->installed_release['notes'] ?? '', 'notesTag' => $panelUpdate?->installed_release['tag'] ?? null, 'notesUrl' => ($panelUpdate?->installed_release['tag'] ?? null) ? $panelUpdate->installed_release['url'] : null])
                <p class="text-muted small panel-update-notes-help">{{ __('webhooks.notes_help') }} <a href="{{ route('admin.settings.updates', [], false) }}">{{ __('webhooks.updates') }} &rarr;</a></p>
                @if($panelUpdate?->last_error)<p class="text-warning">{{ $panelUpdate->last_error }}</p>@endif
                @if($panelUpdate?->latest_version)
                    <p class="text-muted small">{{ __('webhooks.latest') }} <strong>{{ $panelUpdate->latest_version }}</strong> &middot; {{ $panelUpdate->checked_at?->diffForHumans() }} <a href="{{ route('admin.settings.updates', [], false) }}">{{ __('webhooks.updates') }} &rarr;</a></p>
                @endif
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://discord.euphoriadevelopment.uk" class="btn btn-warning" style="width:100%;" target="_blank" rel="noopener noreferrer"><i class="fa fa-fw fa-comments" aria-hidden="true"></i> {{ __('admin/ui.get_help') }}</a>
    </div>
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://aquadactyl.uk/docs" class="btn btn-primary" style="width:100%;" target="_blank" rel="noopener noreferrer"><i class="fa fa-fw fa-book" aria-hidden="true"></i> {{ __('admin/ui.documentation') }}</a>
    </div>
    <div class="clearfix visible-xs-block">&nbsp;</div>
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://github.com/Aquadactyl/aquadactyl" class="btn btn-primary" style="width:100%;" target="_blank" rel="noopener noreferrer"><i class="fa fa-fw fa-github" aria-hidden="true"></i> GitHub</a>
    </div>
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://aquadactyl.uk" class="btn btn-success" style="width:100%;" target="_blank" rel="noopener noreferrer"><i class="fa fa-fw fa-globe" aria-hidden="true"></i> {{ __('admin/ui.website') }}</a>
    </div>
</div>
@endsection
