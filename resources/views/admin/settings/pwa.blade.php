@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'pwa'])
@section('title', __('pwa.title'))
@section('content-header')
    <h1>{{ __('admin/ui.settings') }}<small>{{ __('pwa.title') }}</small></h1>
@endsection
@section('content')
    @yield('settings::nav')
    <form action="{{ route('admin.settings.pwa', [], false) }}" method="POST">
        @csrf
        @method('PATCH')
        <div class="box box-primary">
            <div class="box-header with-border"><h3 class="box-title">{{ __('pwa.title') }}</h3></div>
            <div class="box-body">
                @if($disabled)<div class="alert alert-info">{{ __('admin/custom.environment_only') }}</div>@endif
                <p class="text-muted">{{ __('pwa.description') }}</p>
                <div class="row">
                    <div class="col-md-6 form-group"><label for="pwa-enabled">{{ __('pwa.enabled') }}</label><select id="pwa-enabled" class="form-control" name="enabled" @disabled($disabled)><option value="1" @selected(old('enabled', config('aquadactyl.pwa.enabled')))>{{ __('pwa.on') }}</option><option value="0" @selected(!old('enabled', config('aquadactyl.pwa.enabled')))>{{ __('pwa.off') }}</option></select><p class="help-block">{{ __('pwa.enabled_help') }}</p></div>
                    <div class="col-md-6 form-group"><label for="pwa-offline">{{ __('pwa.offline') }}</label><select id="pwa-offline" class="form-control" name="offline_enabled" @disabled($disabled)><option value="1" @selected(old('offline_enabled', config('aquadactyl.pwa.offline_enabled')))>{{ __('pwa.on') }}</option><option value="0" @selected(!old('offline_enabled', config('aquadactyl.pwa.offline_enabled')))>{{ __('pwa.off') }}</option></select><p class="help-block">{{ __('pwa.offline_help') }}</p></div>
                </div>
                <div class="row">
                    <div class="col-md-6 form-group"><label for="pwa-name">{{ __('pwa.app_name') }}</label><input id="pwa-name" name="app_name" class="form-control" maxlength="191" value="{{ old('app_name', config('aquadactyl.pwa.app_name')) }}" placeholder="{{ config('app.name') }}" @disabled($disabled)><p class="help-block">{{ __('pwa.name_help') }}</p></div>
                    <div class="col-md-6 form-group"><label for="pwa-short-name">{{ __('pwa.short_name') }}</label><input id="pwa-short-name" name="short_name" class="form-control" maxlength="30" value="{{ old('short_name', config('aquadactyl.pwa.short_name')) }}" @disabled($disabled)><p class="help-block">{{ __('pwa.short_help') }}</p></div>
                </div>
                <p class="text-muted">{{ __('pwa.branding_help') }} <a href="{{ route('admin.settings.appearance', [], false) }}">{{ __('admin/custom.appearance') }} &rarr;</a></p>
                <div class="pwa-settings-help"><p>{{ __('pwa.install_help') }}</p><p>{{ __('pwa.disable_help') }}</p></div>
            </div>
            <div class="box-footer"><button class="btn btn-primary" @disabled($disabled)>{{ __('admin/ui.save') }}</button></div>
        </div>
    </form>
@endsection
