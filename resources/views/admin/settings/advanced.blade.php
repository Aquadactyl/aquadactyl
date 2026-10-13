@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'advanced'])

@section('title')
    {{ __('admin/ui.advanced_settings') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.advanced_settings') }}<small>{{ __('admin/ui.configure_advanced_settings_for_aquadactyl') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index', [], false) }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/ui.settings') }}</li>
    </ol>
@endsection

@section('content')
    @yield('settings::nav')
    <div class="row">
        <div class="col-xs-12">
            <form action="" method="POST">
                <div class="box">
                    <div class="box-header with-border">
                        <h3 class="box-title">{{ __('admin/ui.aquadactyl_telemetry') }}</h3>
                    </div>
                    <div class="box-body">
                        <div class="form-group">
                            <label class="control-label">{{ __('admin/ui.status') }}</label>
                            <select class="form-control" name="aquadactyl:telemetry:enabled">
                                <option value="false">{{ __('admin/ui.disabled') }}</option>
                                <option value="true" @if(filter_var(old('aquadactyl:telemetry:enabled', config('aquadactyl.telemetry.enabled', false)), FILTER_VALIDATE_BOOLEAN)) selected @endif>{{ __('admin/ui.enabled') }}</option>
                            </select>
                            <p class="text-muted small">
                                {{ __('admin/ui.optional_and_disabled_by_default_when_enabled_aquadactyl_sends_one_daily_request_cont') }}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="box">
                    <div class="box-header with-border">
                        <h3 class="box-title">Captcha</h3>
                    </div>
                    <div class="box-body">
                        <div class="row">
                            <div class="form-group col-md-4">
                                <label class="control-label">{{ __('admin/ui.provider') }}</label>
                                <div>
                                    @php
                                        $rawEnabled = old('recaptcha:enabled', config('recaptcha.enabled'));
                                        $currentEnabled = filter_var($rawEnabled, FILTER_VALIDATE_BOOLEAN);
                                        $currentProvider = old('recaptcha:provider', config('recaptcha.provider', 'recaptcha'));
                                    @endphp
                                    <input type="hidden" name="recaptcha:enabled" id="recaptcha_enabled" value="{{ $currentEnabled ? 'true' : 'false' }}">
                                    <select class="form-control" name="recaptcha:provider" id="captcha_provider_select" onchange="document.getElementById('recaptcha_enabled').value = this.value === 'disabled' ? 'false' : 'true'">
                                        <option value="disabled" @if(!$currentEnabled || $currentProvider === 'disabled') selected @endif>{{ __('admin/ui.disabled') }}</option>
                                        <option value="recaptcha" @if($currentEnabled && $currentProvider === 'recaptcha') selected @endif>Google reCAPTCHA</option>
                                        <option value="hcaptcha" @if($currentEnabled && $currentProvider === 'hcaptcha') selected @endif>hCaptcha</option>
                                        <option value="turnstile" @if($currentEnabled && $currentProvider === 'turnstile') selected @endif>Cloudflare Turnstile</option>
                                    </select>
                                    <p class="text-muted small">{{ __('admin/ui.choose_the_captcha_provider_to_protect_authentication_forms_or_disable_captcha_comple') }}</p>
                                </div>
                            </div>
                            <div class="form-group col-md-4">
                                <label class="control-label">{{ __('admin/ui.site_key') }}</label>
                                <div>
                                    <input type="text" class="form-control" name="recaptcha:website_key" value="{{ old('recaptcha:website_key', config('recaptcha.website_key')) }}">
                                </div>
                            </div>
                            <div class="form-group col-md-4">
                                <label class="control-label">{{ __('admin/ui.secret_key') }}</label>
                                <div>
                                    <input type="text" class="form-control" name="recaptcha:secret_key" value="{{ old('recaptcha:secret_key', config('recaptcha.secret_key')) }}">
                                    <p class="text-muted small">{{ __('admin/ui.used_for_server_side_verification_with_your_captcha_provider_keep_this_secret') }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="box">
                    <div class="box-header with-border">
                        <h3 class="box-title">{{ __('admin/ui.http_connections') }}</h3>
                    </div>
                    <div class="box-body">
                        <div class="row">
                            <div class="form-group col-md-6">
                                <label class="control-label">{{ __('admin/ui.connection_timeout') }}</label>
                                <div>
                                    <input type="number" required class="form-control" name="pterodactyl:guzzle:connect_timeout" value="{{ old('pterodactyl:guzzle:connect_timeout', config('pterodactyl.guzzle.connect_timeout')) }}">
                                    <p class="text-muted small">{{ __('admin/ui.the_amount_of_time_in_seconds_to_wait_for_a_connection_to_be_opened_before_throwing_a') }}</p>
                                </div>
                            </div>
                            <div class="form-group col-md-6">
                                <label class="control-label">{{ __('admin/ui.request_timeout') }}</label>
                                <div>
                                    <input type="number" required class="form-control" name="pterodactyl:guzzle:timeout" value="{{ old('pterodactyl:guzzle:timeout', config('pterodactyl.guzzle.timeout')) }}">
                                    <p class="text-muted small">{{ __('admin/ui.the_amount_of_time_in_seconds_to_wait_for_a_request_to_be_completed_before_throwing_a') }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="box">
                    <div class="box-header with-border">
                        <h3 class="box-title">{{ __('admin/ui.automatic_allocation_creation') }}</h3>
                    </div>
                    <div class="box-body">
                        <div class="row">
                            <div class="form-group col-md-4">
                                <label class="control-label">{{ __('admin/ui.status') }}</label>
                                <div>
                                    <select class="form-control" name="pterodactyl:client_features:allocations:enabled">
                                        <option value="false">{{ __('admin/ui.disabled') }}</option>
                                        <option value="true" @if(filter_var(old('pterodactyl:client_features:allocations:enabled', config('pterodactyl.client_features.allocations.enabled')), FILTER_VALIDATE_BOOLEAN)) selected @endif>{{ __('admin/ui.enabled') }}</option>
                                    </select>
                                    <p class="text-muted small">{{ __('admin/ui.if_enabled_users_will_have_the_option_to_automatically_create_new_allocations_for_the') }}</p>
                                </div>
                            </div>
                            <div class="form-group col-md-4">
                                <label class="control-label">{{ __('admin/ui.starting_port') }}</label>
                                <div>
                                    <input type="number" class="form-control" name="pterodactyl:client_features:allocations:range_start" value="{{ old('pterodactyl:client_features:allocations:range_start', config('pterodactyl.client_features.allocations.range_start')) }}">
                                    <p class="text-muted small">{{ __('admin/ui.the_starting_port_in_the_range_that_can_be_automatically_allocated') }}</p>
                                </div>
                            </div>
                            <div class="form-group col-md-4">
                                <label class="control-label">{{ __('admin/ui.ending_port') }}</label>
                                <div>
                                    <input type="number" class="form-control" name="pterodactyl:client_features:allocations:range_end" value="{{ old('pterodactyl:client_features:allocations:range_end', config('pterodactyl.client_features.allocations.range_end')) }}">
                                    <p class="text-muted small">{{ __('admin/ui.the_ending_port_in_the_range_that_can_be_automatically_allocated') }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="box box-primary">
                    <div class="box-footer">
                        {{ csrf_field() }}
                        <button type="submit" name="_method" value="PATCH" class="btn btn-sm btn-primary pull-right">{{ __('admin/ui.save') }}</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
@endsection
