@extends('layouts.admin')
@section('title', __('notifications.heading'))
@section('content-header')
    <h1>{{ __('admin/ui.settings') }}<small>{{ __('notifications.heading') }}</small></h1>
@endsection
@section('content')
    @include('partials/admin.settings.nav', ['activeTab' => 'notifications'])
    @yield('settings::nav')
    <form method="POST" action="{{ route('admin.settings.notifications.update', [], false) }}">
        {!! csrf_field() !!}
        <div class="box box-primary">
            <div class="box-header with-border"><h3 class="box-title">{{ __('notifications.heading') }}</h3></div>
            <div class="box-body">
                <div class="form-group">
                    <input type="hidden" name="enabled" value="0">
                    <label><input type="checkbox" name="enabled" value="1" @checked(old('enabled', $enabled))> {{ __('notifications.enabled') }}</label>
                    <p class="text-muted">{{ __('notifications.enabled_help') }}</p>
                </div>
                <div class="form-group">
                    <input type="hidden" name="discord_enabled" value="0">
                    <label><input type="checkbox" name="discord_enabled" value="1" @checked(old('discord_enabled', $discord_enabled))> {{ __('notifications.discord_enabled') }}</label>
                    <p class="text-muted">{{ __('notifications.discord_help') }}</p>
                </div>
                <p class="text-muted">{{ __('notifications.retention') }}</p>
                <p class="text-muted">{{ __('notifications.crashes') }}</p>
                <div class="form-group"><label for="notification-password">{{ __('notifications.password') }}</label><input id="notification-password" type="password" name="current_password" class="form-control" required autocomplete="current-password"></div>
            </div>
            <div class="box-footer"><button class="btn btn-primary" type="submit">{{ __('notifications.save') }}</button></div>
        </div>
    </form>
@endsection
