@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'appearance'])

@section('title', __('admin/custom.appearance'))
@section('content-header')
    <h1>{{ __('admin/custom.appearance') }}<small>{{ __('admin/custom.appearance_description') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/custom.appearance') }}</li>
    </ol>
@endsection

@section('content')
    @yield('settings::nav')
    <form action="{{ route('admin.settings.appearance') }}" method="POST" id="appearance-settings">
        @csrf
        @method('PATCH')
        <fieldset @disabled($disabled)>
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/custom.primary_color') }}</h3></div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="primary-color">{{ __('admin/custom.primary_color') }}</label>
                        <input type="color" id="primary-color" name="primary_color" value="{{ old('primary_color', $appearance['primaryColor']) }}" class="appearance-color-input">
                        <output id="primary-color-value" for="primary-color">{{ old('primary_color', $appearance['primaryColor']) }}</output>
                        <p class="text-muted">{{ __('admin/custom.primary_color_help') }}</p>
                    </div>
                </div>
            </div>
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/custom.login_layout') }}</h3></div>
                <div class="box-body">
                    <p class="text-muted">{{ __('admin/custom.login_layout_help') }}</p>
                    <div class="appearance-layout-options">
                        @foreach(['center', 'split-left', 'split-right'] as $layout)
                            <label class="appearance-layout-option">
                                <input type="radio" name="login_layout" value="{{ $layout }}" @checked(old('login_layout', $appearance['loginLayout']) === $layout)>
                                <span class="appearance-layout-diagram" data-layout="{{ $layout }}" aria-hidden="true"><span class="diagram-form"><i></i><i></i><i></i></span><span class="diagram-image"></span></span>
                                <span>{{ __('admin/custom.layout_' . str_replace('-', '_', $layout)) }}</span>
                            </label>
                        @endforeach
                    </div>
                    <div class="form-group">
                        <label for="login-logo-position">{{ __('admin/custom.logo_position') }}</label>
                        <select id="login-logo-position" name="login_logo_position" class="form-control">
                            @foreach(['above', 'inside', 'opposite'] as $position)
                                <option value="{{ $position }}" @selected(old('login_logo_position', $appearance['loginLogoPosition']) === $position)>{{ __('admin/custom.logo_' . $position) }}</option>
                            @endforeach
                        </select>
                        <p class="text-muted">{{ __('admin/custom.logo_position_help') }}</p>
                    </div>
                    <div class="appearance-preview" id="login-preview" data-background="{{ $appearance['loginBackground']['url'] ?? '' }}" aria-label="{{ __('admin/custom.login_preview') }}">
                        <div class="appearance-preview-background"></div>
                        <div class="appearance-preview-logo"><img src="{{ config('aquadactyl.branding.logo_path') ? '/storage/' . config('aquadactyl.branding.logo_path') : '/branding/aquadactyl-wordmark.png' }}" alt=""></div>
                        <div class="appearance-preview-form">
                            <strong>{{ __('admin/custom.preview_sign_in') }}</strong>
                            <span class="preview-input"></span><span class="preview-input"></span>
                            <span class="preview-button">{{ __('admin/custom.preview_sign_in') }}</span>
                        </div>
                    </div>
                    <p class="text-muted small">{{ __('admin/custom.preview_help') }}</p>
                </div>
            </div>
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/custom.background_effects') }}</h3></div>
                <div class="box-body">
                    <div class="row">
                        @foreach(['login', 'client'] as $area)
                            <div class="col-md-6">
                                <h4>{{ __('admin/custom.' . $area . '_background') }}</h4>
                                @foreach(['blur' => [0, 30, 'px'], 'overlay' => [0, 95, '%']] as $effect => [$min, $max, $unit])
                                    @php($value = old($area . '_' . $effect, $appearance[$area . 'Background'][$effect]))
                                    <div class="form-group">
                                        <label for="{{ $area }}-{{ $effect }}">{{ __('admin/custom.' . $effect) }} <output for="{{ $area }}-{{ $effect }}" id="{{ $area }}-{{ $effect }}-value">{{ $value }}{{ $unit }}</output></label>
                                        <input type="range" class="appearance-range" id="{{ $area }}-{{ $effect }}" name="{{ $area }}_{{ $effect }}" min="{{ $min }}" max="{{ $max }}" step="1" value="{{ $value }}" data-unit="{{ $unit }}">
                                    </div>
                                @endforeach
                            </div>
                        @endforeach
                    </div>
                    <p class="text-muted">{{ __('admin/custom.background_effects_help') }}</p>
                    <div class="appearance-preview appearance-client-preview" id="client-preview" data-background="{{ $appearance['clientBackground']['url'] ?? '' }}" aria-label="{{ __('admin/custom.client_preview') }}">
                        <div class="appearance-preview-background"></div>
                        <div class="preview-navigation"><span>Aquadactyl</span><span class="preview-button">{{ __('admin/custom.preview_account') }}</span></div>
                        <div class="preview-client-card"><strong>{{ __('admin/custom.preview_server') }}</strong><span class="preview-input"></span></div>
                    </div>
                </div>
                <div class="box-footer"><button type="submit" class="btn btn-primary">{{ __('admin/ui.save') }}</button></div>
            </div>
        </fieldset>
    </form>
    <div class="row">
        @foreach(['login', 'client'] as $area)
            <div class="col-md-6">
                <div class="box">
                    <div class="box-header with-border"><h3 class="box-title">{{ __('admin/custom.' . $area . '_background') }}</h3></div>
                    <div class="box-body">
                        <p class="text-muted">{{ __('admin/custom.background_upload_help') }}</p>
                        <form action="{{ route('admin.settings.background', $area) }}" method="POST" enctype="multipart/form-data" class="background-upload-form">
                            @csrf
                            <fieldset @disabled($disabled)>
                                <div class="form-group"><label for="{{ $area }}-background-file">{{ __('admin/custom.background_image') }}</label><input id="{{ $area }}-background-file" type="file" name="background" accept="image/png,image/jpeg,image/webp" required class="form-control" data-preview-area="{{ $area }}"></div>
                                <button type="submit" class="btn btn-primary btn-sm">{{ __('admin/custom.upload_background') }}</button>
                            </fieldset>
                        </form>
                        @if($appearance[$area . 'Background']['url'])
                            <form action="{{ route('admin.settings.background', $area) }}" method="POST" class="background-remove-form">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-danger btn-sm" @disabled($disabled)>{{ __('admin/custom.remove_background') }}</button>
                            </form>
                        @endif
                    </div>
                </div>
            </div>
        @endforeach
    </div>
@endsection

@section('footer-scripts')
    @parent
    {!! Theme::js('js/admin/appearance.js?v=' . filemtime(public_path('themes/pterodactyl/js/admin/appearance.js'))) !!}
@endsection
