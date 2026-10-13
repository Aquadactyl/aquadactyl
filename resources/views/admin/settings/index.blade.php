@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'basic'])

@section('title')
    {{ __('admin/ui.settings') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.site_settings') }}<small>{{ __('admin/ui.configure_your_branding_and_the_features_available_to_users') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index', [], false) }}">{{ __('admin/ui.admin') }}</a></li>
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
                <form action="{{ route('admin.settings', [], false) }}" method="POST">
                    <div class="box-body">
                        <div class="row">
                            <div class="form-group col-lg-6">
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
                            <div class="form-group col-lg-6">
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
                                'console_log_sharing' => [__('admin/custom.console_log_sharing'), __('admin/custom.console_log_sharing_help')],
                                'file_trash' => [__('admin/custom.file_trash'), __('admin/custom.file_trash_help')],
                            ];
                        @endphp
                        <div class="row">
                            @foreach($features as $key => [$label, $description])
                                @php
                                    $field = 'aquadactyl:features:' . $key;
                                    $default = !in_array($key, ['registration', 'console_log_sharing', 'file_trash'], true);
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
                        <div class="form-group" id="trash-retention-settings">
                            <label class="control-label" for="trash-retention-days">{{ __('admin/custom.trash_retention') }}</label>
                            <input type="number" class="form-control" id="trash-retention-days" name="aquadactyl:trash:retention_days" min="1" max="365" value="{{ old('aquadactyl:trash:retention_days', config('aquadactyl.trash.retention_days', 7)) }}" />
                            <p class="text-muted"><small>{{ __('admin/custom.trash_retention_help') }}</small></p>
                        </div>
                        {!! csrf_field() !!}
                        <button type="submit" name="_method" value="PATCH" class="btn btn-sm btn-primary pull-right">{{ __('admin/ui.save_site_settings') }}</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <p class="text-muted">{{ __('admin/custom.branding_moved') }} <a href="{{ route('admin.settings.appearance', [], false) }}">{{ __('admin/custom.appearance') }}</a></p>
@endsection

@section('footer-scripts')
    @parent
    <script>
        (function () {
            var feature = document.getElementById('feature-file_trash');
            var container = document.getElementById('trash-retention-settings');
            var input = document.getElementById('trash-retention-days');
            function updateTrashRetention() {
                var enabled = feature.value === 'true';
                container.hidden = !enabled;
                input.disabled = !enabled;
            }
            $(feature).on('change', updateTrashRetention);
            updateTrashRetention();
        })();
    </script>
@endsection
