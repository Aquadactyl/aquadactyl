@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'discord'])
@section('title', __('integrations.discord.heading'))
@section('content-header')
    <h1>{{ __('integrations.discord.heading') }}<small>{{ __('integrations.discord.admin_help') }}</small></h1>
@endsection
@section('content')
    @yield('settings::nav')
    @unless($oauthEnabled)<div class="alert alert-info">{{ __('integrations.discord.oauth_help') }} <a href="{{ route('admin.settings.oauth', [], false) }}">OAuth &rarr;</a></div>@endunless
    <form method="POST" action="{{ route('admin.settings.discord', [], false) }}" class="box box-primary" autocomplete="off">
        @csrf @method('PATCH')
        <div class="box-header with-border"><h3 class="box-title">{{ __('integrations.discord.connection') }}</h3></div>
        <div class="box-body">
            <div class="row">
                <div class="form-group col-sm-4"><label for="discord-enabled">{{ __('integrations.enabled') }}</label><select id="discord-enabled" name="enabled" class="form-control"><option value="0" @selected(!$enabled)>{{ __('integrations.disabled') }}</option><option value="1" @selected($enabled)>{{ __('integrations.enabled') }}</option></select></div>
                <div class="form-group col-sm-8"><label for="discord-guild">{{ __('integrations.discord.guild_id') }}</label><input id="discord-guild" name="guild_id" class="form-control" inputmode="numeric" pattern="[1-9][0-9]{16,19}" maxlength="20" value="{{ $guildId }}"></div>
            </div>
            <div class="form-group"><label for="discord-token">{{ __('integrations.discord.bot_token') }}</label><input id="discord-token" name="bot_token" class="form-control" type="password" maxlength="255" autocomplete="new-password" placeholder="{{ $hasToken ? __('integrations.discord.token_saved') : '' }}"><p class="text-muted small">{{ __('integrations.discord.token_help') }}</p><label><input type="checkbox" name="clear_token" value="1"> {{ __('integrations.discord.clear_token') }}</label></div>
            <p class="text-muted">{{ __('integrations.discord.setup_help') }}</p>
            <p class="text-muted small">{{ __('integrations.discord.pause_help') }}</p>
            <div class="form-group"><label for="discord-password">{{ __('admin/ui.your_current_password') }}</label><input id="discord-password" name="current_password" class="form-control" type="password" autocomplete="current-password" required></div>
        </div>
        <div class="box-footer"><button class="btn btn-primary" type="submit">{{ __('integrations.save') }}</button></div>
    </form>
    <div class="box">
        <div class="box-header with-border"><h3 class="box-title">{{ __('integrations.discord.synchronization') }}</h3></div>
        <div class="box-body">
            <div class="integration-summary"><span>{{ __('integrations.discord.linked', ['count' => $linked]) }}</span><span>{{ __('integrations.discord.grants', ['count' => $grants]) }}</span><span>{{ __('integrations.discord.last_sync') }}: {{ $lastSyncedAt ?? __('integrations.discord.not_yet') }}</span></div>
            <p class="text-muted small">{{ __('integrations.discord.sync_help') }}</p>
            <form method="POST" action="{{ route('admin.settings.discord.sync', [], false) }}">@csrf<button class="btn btn-default" type="submit" @disabled(!$enabled)><i class="fa fa-refresh" aria-hidden="true"></i> {{ __('integrations.discord.sync_now') }}</button></form>
            @foreach($syncErrors as $error)<p class="integration-sync-error"><code>{{ $error->discord_id }}</code> {{ $error->last_error }} <small>{{ $error->updated_at->diffForHumans() }}</small></p>@endforeach
        </div>
    </div>
    <div class="box">
        <div class="box-header with-border"><h3 class="box-title">{{ __('integrations.discord.rules') }}</h3></div>
        <div class="box-body">
            <p class="text-muted">{{ __('integrations.discord.rules_help') }}</p>
            <p class="text-muted small">{{ __('integrations.discord.ownership_help') }}</p>
            @foreach($rules as $rule)
                <details class="integration-rule"><summary><strong>{{ $rule->name }}</strong><span>{{ $rule->enabled ? __('integrations.enabled') : __('integrations.disabled') }} &middot; {{ $rule->role_id }}</span></summary>
                    <form method="POST" action="{{ route('admin.settings.discord.rules', [], false) . '/' . $rule->id }}">
                        @csrf @method('PATCH')
                        @include('admin.settings.partials.discord-rule', ['rule' => $rule])
                        <button class="btn btn-primary" type="submit">{{ __('integrations.save') }}</button>
                    </form>
                    <form class="integration-remove-rule" method="POST" action="{{ route('admin.settings.discord.rules', [], false) . '/' . $rule->id }}">@csrf @method('DELETE')<button class="btn btn-danger btn-sm" type="submit">{{ __('integrations.remove') }}</button></form>
                </details>
            @endforeach
            <h4>{{ __('integrations.discord.add_rule') }}</h4>
            <form method="POST" action="{{ route('admin.settings.discord.rules', [], false) }}">
                @csrf
                @include('admin.settings.partials.discord-rule', ['rule' => null])
                <button class="btn btn-primary" type="submit">{{ __('integrations.discord.add_rule') }}</button>
            </form>
        </div>
    </div>
@endsection
