@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'oauth'])

@section('title', 'OAuth Settings')

@section('content-header')
    <h1>OAuth Settings<small>Manage account sign-in providers and passkeys.</small></h1>
    <ol class="breadcrumb"><li><a href="{{ route('admin.index') }}">Admin</a></li><li>Settings</li><li class="active">OAuth</li></ol>
@endsection

@section('content')
    @yield('settings::nav')
    <form method="POST" action="{{ route('admin.settings.oauth') }}" autocomplete="off">
        @csrf
        @method('PATCH')
        <div class="box">
            <div class="box-header with-border"><h3 class="box-title">Passkeys</h3></div>
            <div class="box-body">
                <div class="form-group">
                    <label for="passkeys_enabled">Allow passkey sign-in and enrolment</label>
                    <select id="passkeys_enabled" name="passkeys_enabled" class="form-control">
                        <option value="1" @selected($passkeysEnabled)>Enabled</option>
                        <option value="0" @selected(!$passkeysEnabled)>Disabled</option>
                    </select>
                    <p class="text-muted small">Users register passkeys in Account settings. HTTPS is required, except on localhost. Existing passkeys are retained when disabled.</p>
                    <p class="text-muted small">Panel address: <code>{{ $origin }}</code>. Keep APP_URL consistent with the address users visit.</p>
                </div>
            </div>
        </div>
        <div class="alert alert-info">Users link providers from their existing Account settings before using OAuth sign-in. Two-step verification still applies. Register the exact callback URL shown for each provider.</div>
        @foreach($providers as $id => $provider)
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">{{ \Pterodactyl\Services\Accounts\AccountSecuritySettings::PROVIDERS[$id] }}</h3></div>
                <div class="box-body">
                    <div class="row">
                        <div class="form-group col-md-4">
                            <label for="{{ $id }}_enabled">Provider status</label>
                            <select id="{{ $id }}_enabled" name="providers[{{ $id }}][enabled]" class="form-control">
                                <option value="0" @selected(!$provider['enabled'])>Disabled</option>
                                <option value="1" @selected($provider['enabled'])>Enabled</option>
                            </select>
                        </div>
                        <div class="form-group col-md-8">
                            <label for="{{ $id }}_client_id">Client ID</label>
                            <input id="{{ $id }}_client_id" name="providers[{{ $id }}][client_id]" class="form-control" value="{{ $provider['client_id'] }}" maxlength="255" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="{{ $id }}_client_secret">Client secret</label>
                        <input id="{{ $id }}_client_secret" name="providers[{{ $id }}][client_secret]" type="password" autocomplete="new-password" class="form-control" maxlength="4096" placeholder="{{ $provider['has_secret'] ? 'Saved — leave blank to keep the current secret' : 'Enter the provider client secret' }}" />
                        <p class="text-muted small">Secrets are encrypted and never displayed. Leave blank to keep the saved secret.</p>
                        <label><input type="checkbox" name="providers[{{ $id }}][clear_secret]" value="1" /> Clear the saved secret (disable the provider first)</label>
                    </div>
                    @if($id === 'oidc')
                        <div class="row">
                            <div class="form-group col-md-8">
                                <label for="oidc_issuer">Issuer URL</label>
                                <input id="oidc_issuer" name="providers[oidc][issuer]" type="url" class="form-control" value="{{ $provider['issuer'] }}" placeholder="https://identity.example.com/realms/panel" maxlength="2048" />
                                <p class="text-muted small">The issuer must publish OpenID Connect discovery and signing keys, support PKCE S256, and sign ID tokens with RS256 or ES256.</p>
                            </div>
                            <div class="form-group col-md-4">
                                <label for="oidc_label">Button label</label>
                                <input id="oidc_label" name="providers[oidc][label]" class="form-control" value="{{ $provider['label'] }}" maxlength="60" />
                            </div>
                        </div>
                    @endif
                    <label>Callback URL</label>
                    <p class="help-block" style="overflow-wrap:anywhere"><code>{{ $provider['redirect'] }}</code></p>
                </div>
            </div>
        @endforeach
        <div class="box">
            <div class="box-body">
                <div class="form-group"><label for="current_password">Your current password</label><input id="current_password" name="current_password" type="password" autocomplete="current-password" class="form-control" required /></div>
                <button type="submit" class="btn btn-primary">Save sign-in settings</button>
            </div>
        </div>
    </form>
@endsection
