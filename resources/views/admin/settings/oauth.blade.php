@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'oauth'])

@section('title', __('admin/ui.oauth_settings'))

@section('content-header')
    <h1>{{ __('admin/ui.oauth_settings') }}<small>{{ __('admin/ui.manage_account_sign_in_providers_and_passkeys') }}</small></h1>
    <ol class="breadcrumb"><li><a href="{{ route('admin.index', [], false) }}">{{ __('admin/ui.admin') }}</a></li><li>{{ __('admin/ui.settings') }}</li><li class="active">OAuth</li></ol>
@endsection

@section('content')
    @yield('settings::nav')
    <form method="POST" action="{{ route('admin.settings.oauth', [], false) }}" autocomplete="off">
        @csrf
        @method('PATCH')
        <div class="box">
            <div class="box-header with-border"><h3 class="box-title">{{ __('admin/ui.passkeys') }}</h3></div>
            <div class="box-body">
                <div class="form-group">
                    <label for="passkeys_enabled">{{ __('admin/ui.allow_passkey_sign_in_and_enrolment') }}</label>
                    <select id="passkeys_enabled" name="passkeys_enabled" class="form-control">
                        <option value="1" @selected($passkeysEnabled)>{{ __('admin/ui.enabled') }}</option>
                        <option value="0" @selected(!$passkeysEnabled)>{{ __('admin/ui.disabled') }}</option>
                    </select>
                    <p class="text-muted small">{{ __('admin/ui.users_register_passkeys_in_account_settings_https_is_required_except_on_localhost_exi') }}</p>
                    <p class="text-muted small">{{ __('admin/ui.panel_address') }} <code>{{ $origin }}</code>{{ __('admin/ui.keep_app_url_consistent_with_the_address_users_visit') }}</p>
                </div>
            </div>
        </div>
        <div class="alert alert-info">{{ __('admin/ui.users_link_providers_from_their_existing_account_settings_before_using_oauth_sign_in') }}</div>
        @foreach($providers as $id => $provider)
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">{{ \Pterodactyl\Services\Accounts\AccountSecuritySettings::PROVIDERS[$id] }}</h3></div>
                <div class="box-body">
                    <div class="row">
                        <div class="form-group col-md-4">
                            <label for="{{ $id }}_enabled">{{ __('admin/ui.provider_status') }}</label>
                            <select id="{{ $id }}_enabled" name="providers[{{ $id }}][enabled]" class="form-control">
                                <option value="0" @selected(!$provider['enabled'])>{{ __('admin/ui.disabled') }}</option>
                                <option value="1" @selected($provider['enabled'])>{{ __('admin/ui.enabled') }}</option>
                            </select>
                        </div>
                        <div class="form-group col-md-8">
                            <label for="{{ $id }}_client_id">{{ __('admin/ui.client_id') }}</label>
                            <input id="{{ $id }}_client_id" name="providers[{{ $id }}][client_id]" class="form-control" value="{{ $provider['client_id'] }}" maxlength="255" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="{{ $id }}_client_secret">{{ __('admin/ui.client_secret') }}</label>
                        <input id="{{ $id }}_client_secret" name="providers[{{ $id }}][client_secret]" type="password" autocomplete="new-password" class="form-control" maxlength="4096" placeholder="{{ $provider['has_secret'] ? __('admin/ui.saved_client_secret') : __('admin/ui.enter_client_secret') }}" />
                        <p class="text-muted small">{{ __('admin/ui.secrets_are_encrypted_and_never_displayed_leave_blank_to_keep_the_saved_secret') }}</p>
                        <label><input type="checkbox" name="providers[{{ $id }}][clear_secret]" value="1" /> {{ __('admin/ui.clear_the_saved_secret_disable_the_provider_first') }}</label>
                    </div>
                    @if($id === 'oidc')
                        <div class="row">
                            <div class="form-group col-md-8">
                                <label for="oidc_issuer">{{ __('admin/ui.issuer_url') }}</label>
                                <input id="oidc_issuer" name="providers[oidc][issuer]" type="url" class="form-control" value="{{ $provider['issuer'] }}" placeholder="https://identity.example.com/realms/panel" maxlength="2048" />
                                <p class="text-muted small">{{ __('admin/ui.the_issuer_must_publish_openid_connect_discovery_and_signing_keys_support_pkce_s256_a') }}</p>
                            </div>
                            <div class="form-group col-md-4">
                                <label for="oidc_label">{{ __('admin/ui.button_label') }}</label>
                                <input id="oidc_label" name="providers[oidc][label]" class="form-control" value="{{ $provider['label'] }}" maxlength="60" />
                            </div>
                        </div>
                    @endif
                    <label>{{ __('admin/ui.callback_url') }}</label>
                    <p class="help-block" style="overflow-wrap:anywhere"><code>{{ $provider['redirect'] }}</code></p>
                </div>
            </div>
        @endforeach
        <div class="box">
            <div class="box-body">
                <div class="form-group"><label for="current_password">{{ __('admin/ui.your_current_password') }}</label><input id="current_password" name="current_password" type="password" autocomplete="current-password" class="form-control" required /></div>
                <button type="submit" class="btn btn-primary">{{ __('admin/ui.save_sign_in_settings') }}</button>
            </div>
        </div>
    </form>
@endsection
