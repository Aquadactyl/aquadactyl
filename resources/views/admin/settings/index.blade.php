@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'basic'])

@section('title')
    {{ __('admin/ui.settings') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.site_settings') }}<small>{{ __('admin/ui.configure_your_branding_and_the_features_available_to_users') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/ui.settings') }}</li>
    </ol>
@endsection

@section('content')
    @yield('settings::nav')
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.site_configuration') }}</h3>
                </div>
                <form action="{{ route('admin.settings') }}" method="POST">
                    <div class="box-body">
                        <div class="row">
                            <div class="form-group col-lg-4">
                                <label class="control-label" for="site-name">{{ __('admin/ui.site_name') }}</label>
                                <div>
                                    <input id="site-name" type="text" class="form-control" name="app:name" value="{{ old('app:name', config('app.name')) }}" required maxlength="191" />
                                    <p class="text-muted"><small>{{ __('admin/ui.this_is_the_name_that_is_used_throughout_the_panel_and_in_emails_sent_to_clients') }}</small></p>
                                    <label class="control-label" for="show-site-name">{{ __('admin/ui.show_site_name_beside_logo') }}</label>
                                    @php
                                        $showName = in_array(old('aquadactyl:branding:show_name', config('aquadactyl.branding.show_name', false)), [true, 'true', 1, '1'], true);
                                    @endphp
                                    <select id="show-site-name" class="form-control" name="aquadactyl:branding:show_name">
                                        <option value="false" @if(!$showName) selected @endif>{{ __('admin/ui.logo_only') }}</option>
                                        <option value="true" @if($showName) selected @endif>{{ __('admin/ui.logo_and_site_name') }}</option>
                                    </select>
                                    <p class="text-muted"><small>{{ __('admin/ui.show_the_site_name_alongside_an_uploaded_logo_in_navigation_sign_in_and_admin_headers') }}</small></p>
                                </div>
                            </div>
                            <div class="form-group col-lg-4">
                                <label class="control-label">{{ __('admin/ui.require_2_factor_authentication') }}</label>
                                <div>
                                    <div class="btn-group" data-toggle="buttons">
                                        @php
                                            $level = old('pterodactyl:auth:2fa_required', config('pterodactyl.auth.2fa_required'));
                                        @endphp
                                        <label class="btn btn-primary @if ($level == 0) active @endif">
                                            <input type="radio" name="pterodactyl:auth:2fa_required" autocomplete="off" value="0" @if ($level == 0) checked @endif> {{ __('admin/ui.not_required') }}
                                        </label>
                                        <label class="btn btn-primary @if ($level == 1) active @endif">
                                            <input type="radio" name="pterodactyl:auth:2fa_required" autocomplete="off" value="1" @if ($level == 1) checked @endif> {{ __('admin/ui.admin_only') }}
                                        </label>
                                        <label class="btn btn-primary @if ($level == 2) active @endif">
                                            <input type="radio" name="pterodactyl:auth:2fa_required" autocomplete="off" value="2" @if ($level == 2) checked @endif> {{ __('admin/ui.all_users') }}
                                        </label>
                                    </div>
                                    <p class="text-muted"><small>{{ __('admin/ui.if_enabled_any_account_falling_into_the_selected_grouping_will_be_required_to_have_2') }}</small></p>
                                </div>
                            </div>
                            <div class="form-group col-lg-4">
                                <label class="control-label">{{ __('admin/ui.default_language') }}</label>
                                <div>
                                    <select name="app:locale" class="form-control">
                                        @foreach($languages as $key => $value)
                                            <option value="{{ $key }}" @if(old('app:locale', $defaultLanguage) === $key) selected @endif>{{ $value }}</option>
                                        @endforeach
                                    </select>
                                    <p class="text-muted"><small>{{ __('admin/ui.the_default_language_to_use_when_rendering_ui_components') }}</small></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="box-body site-feature-settings">
                        <h4>{{ __('admin/ui.site_wide_features') }}</h4>
                        <p class="text-muted">{{ __('admin/ui.these_controls_apply_to_all_users_changes_take_effect_when_a_page_is_reloaded') }}</p>
                        @php
                            $features = [
                                'player_counts' => [__('admin/ui.feature_player_counts'), __('admin/ui.feature_player_counts_description')],
                                'custom_profile_pictures' => [__('admin/ui.feature_custom_profile_pictures'), __('admin/ui.feature_custom_profile_pictures_description')],
                                'privacy_mode' => [__('admin/ui.feature_privacy_mode'), __('admin/ui.feature_privacy_mode_description')],
                                'server_quick_actions' => [__('admin/ui.feature_server_quick_actions'), __('admin/ui.feature_server_quick_actions_description')],
                                'registration' => [__('admin/ui.feature_registration'), __('admin/ui.feature_registration_description')],
                            ];
                        @endphp
                        <div class="row">
                            @foreach($features as $key => [$label, $description])
                                @php
                                    $field = 'aquadactyl:features:' . $key;
                                    $default = $key === 'registration' ? false : true;
                                    $enabled = in_array(old($field, config('aquadactyl.features.' . $key, $default)), [true, 'true', 1, '1'], true);
                                @endphp
                                <div class="form-group col-md-6">
                                    <label class="control-label" for="feature-{{ $key }}">{{ $label }}</label>
                                    <select class="form-control" id="feature-{{ $key }}" name="{{ $field }}">
                                        <option value="true" @if($enabled) selected @endif>{{ __('admin/ui.enabled') }}</option>
                                        <option value="false" @if(!$enabled) selected @endif>{{ __('admin/ui.disabled') }}</option>
                                    </select>
                                    <p class="text-muted"><small>{{ $description }}</small></p>
                                </div>
                            @endforeach
                        </div>
                    </div>
                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" name="_method" value="PATCH" class="btn btn-sm btn-primary pull-right">{{ __('admin/ui.save_site_settings') }}</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/ui.site_logo') }}</h3></div>
                <div class="box-body">
                    <p class="text-muted">{{ __('admin/ui.use_your_logo_on_the_sign_in_page_navigation_bar_admin_area_browser_tabs_and_home_scr') }}</p>
                    <div class="site-logo-preview">
                        <img src="{{ config('aquadactyl.branding.logo_path') ? '/storage/' . config('aquadactyl.branding.logo_path') : '/branding/aquadactyl-wordmark.png' }}" alt="{{ __('admin/ui.current_site_logo') }}">
                    </div>
                    <form action="{{ route('admin.settings.logo') }}" method="POST" enctype="multipart/form-data">
                        {!! csrf_field() !!}
                        <div class="form-group">
                            <label for="site-logo">{{ __('admin/ui.logo_file') }}</label>
                            <input id="site-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" required>
                        </div>
                        <button type="submit" class="btn btn-sm btn-primary">{{ __('admin/ui.upload_logo') }}</button>
                    </form>
                    @if(config('aquadactyl.branding.logo_path'))
                        <form action="{{ route('admin.settings.logo') }}" method="POST" style="margin-top:12px;">
                            {!! csrf_field() !!}
                            {!! method_field('DELETE') !!}
                            <button type="submit" class="btn btn-sm btn-default">{{ __('admin/ui.restore_default_logo') }}</button>
                        </form>
                    @endif
                </div>
            </div>
        </div>
    </div>
@endsection
