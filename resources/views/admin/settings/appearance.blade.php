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
    @php
        $logoUrl = config('aquadactyl.branding.logo_path') ? '/storage/' . config('aquadactyl.branding.logo_path') : null;
        $showName = in_array(old('aquadactyl:branding:show_name', config('aquadactyl.branding.show_name', false)), [true, 'true', 1, '1'], true);
    @endphp
    @if($disabled)
        <div class="alert alert-info">{{ __('admin/custom.environment_only') }}</div>
    @endif
    {{-- Fields are associated with this form so image actions can have their own forms. --}}
    <form action="{{ route('admin.settings.appearance') }}" method="POST" id="appearance-settings">
        @csrf
        @method('PATCH')
    </form>
    <div class="appearance-save-bar">
        <span id="appearance-save-status" role="status" data-saved="{{ __('admin/custom.saved_settings') }}" data-unsaved="{{ __('admin/custom.unsaved_changes') }}">{{ __('admin/custom.saved_settings') }}</span>
        <div>
            <button type="reset" form="appearance-settings" class="btn btn-default" @disabled($disabled)>{{ __('admin/custom.reset_changes') }}</button>
            <button type="submit" form="appearance-settings" class="btn btn-primary" @disabled($disabled)>{{ __('admin/ui.save') }}</button>
        </div>
    </div>
    <div class="appearance-editor" id="appearance-editor" data-logo="{{ $logoUrl ?? '' }}" data-upload-error="{{ __('admin/custom.upload_error') }}">
        <div class="appearance-controls">
            <section class="box" id="appearance-branding">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/custom.branding') }}</h3></div>
                <div class="box-body">
                    <fieldset @disabled($disabled)>
                        <div class="form-group">
                            <label for="site-name">{{ __('admin/ui.site_name') }}</label>
                            <input id="site-name" form="appearance-settings" type="text" class="form-control" name="app:name" value="{{ old('app:name', config('app.name')) }}" required maxlength="191">
                            <p class="text-muted">{{ __('admin/ui.this_is_the_name_that_is_used_throughout_the_panel_and_in_emails_sent_to_clients') }}</p>
                        </div>
                        <div class="form-group">
                            <label for="show-site-name">{{ __('admin/ui.show_site_name_beside_logo') }}</label>
                            <select id="show-site-name" form="appearance-settings" class="form-control" name="aquadactyl:branding:show_name">
                                <option value="false" @selected(!$showName)>{{ __('admin/ui.logo_only') }}</option>
                                <option value="true" @selected($showName)>{{ __('admin/ui.logo_and_site_name') }}</option>
                            </select>
                            <p class="text-muted">{{ __('admin/ui.show_the_site_name_alongside_an_uploaded_logo_in_navigation_sign_in_and_admin_headers') }}</p>
                        </div>
                    </fieldset>
                    <label>{{ __('admin/ui.site_logo') }}</label>
                    <div class="site-logo-preview appearance-brand-preview"><img id="site-logo-preview" src="{{ $logoUrl ?? '/branding/aquadactyl-wordmark.png' }}" alt="{{ __('admin/ui.current_site_logo') }}"></div>
                    <p class="text-muted">{{ __('admin/custom.logo_upload_help') }}</p>
                    <form action="{{ route('admin.settings.logo') }}" method="POST" enctype="multipart/form-data" data-image-action="logo" class="appearance-image-form">
                        @csrf
                        <fieldset @disabled($disabled)>
                            <div class="form-group"><label for="site-logo">{{ __('admin/ui.logo_file') }}</label><input id="site-logo" type="file" name="logo" accept="image/png,image/jpeg,image/webp" required class="form-control" data-preview-area="logo"></div>
                            <button type="submit" class="btn btn-primary btn-sm">{{ __('admin/ui.upload_logo') }}</button>
                        </fieldset>
                    </form>
                    <form action="{{ route('admin.settings.logo') }}" method="POST" data-image-action="logo" data-image-remove="logo" class="appearance-image-form background-remove-form" @if(!$logoUrl) hidden @endif>
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="btn btn-default btn-sm" @disabled($disabled)>{{ __('admin/ui.restore_default_logo') }}</button>
                    </form>
                    <p class="appearance-image-status" data-image-status="logo" role="status" aria-live="polite"></p>
                </div>
            </section>
            <section class="box" id="appearance-colours">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/custom.primary_color') }}</h3></div>
                <div class="box-body">
                    <fieldset @disabled($disabled)>
                        <label for="primary-color">{{ __('admin/custom.primary_color') }}</label>
                        <div class="appearance-colour-controls">
                            <input type="color" id="primary-color" form="appearance-settings" name="primary_color" value="{{ old('primary_color', $appearance['primaryColor']) }}" class="appearance-color-input">
                            <input type="text" id="primary-color-hex" form="appearance-settings" class="form-control" value="{{ old('primary_color', $appearance['primaryColor']) }}" required maxlength="7" pattern="#[a-fA-F0-9]{6}" aria-label="{{ __('admin/custom.hex_color') }}" spellcheck="false" autocomplete="off">
                        </div>
                        <div class="appearance-swatches" aria-label="{{ __('admin/custom.color_presets') }}">
                            @foreach(['teal' => '#237c7f', 'blue' => '#2563eb', 'violet' => '#7c3aed', 'rose' => '#be185d', 'amber' => '#f59e0b'] as $name => $color)
                                <button type="button" class="appearance-swatch" data-color="{{ $color }}" style="--swatch:{{ $color }}" aria-label="{{ __('admin/custom.color_' . $name) }}" aria-pressed="false"><span aria-hidden="true"></span>{{ __('admin/custom.color_' . $name) }}</button>
                            @endforeach
                        </div>
                        <p class="text-muted">{{ __('admin/custom.primary_color_help') }}</p>
                    </fieldset>
                </div>
            </section>
            <section class="box" id="appearance-login">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/custom.login_layout') }}</h3></div>
                <div class="box-body">
                    <fieldset @disabled($disabled)>
                        <p class="text-muted">{{ __('admin/custom.login_layout_help') }}</p>
                        <div class="appearance-layout-options">
                            @foreach(['center', 'split-left', 'split-right'] as $layout)
                                <label class="appearance-layout-option">
                                    <input type="radio" form="appearance-settings" name="login_layout" value="{{ $layout }}" @checked(old('login_layout', $appearance['loginLayout']) === $layout)>
                                    <span class="appearance-layout-diagram" data-layout="{{ $layout }}" aria-hidden="true"><span class="diagram-form"><i></i><i></i><i></i></span></span>
                                    <span>{{ __('admin/custom.layout_' . str_replace('-', '_', $layout)) }}</span>
                                </label>
                            @endforeach
                        </div>
                        <div class="form-group">
                            <label for="login-logo-position">{{ __('admin/custom.logo_position') }}</label>
                            <select id="login-logo-position" form="appearance-settings" name="login_logo_position" class="form-control">
                                @foreach(['above', 'inside', 'opposite'] as $position)
                                    <option value="{{ $position }}" @selected(old('login_logo_position', $appearance['loginLogoPosition']) === $position)>{{ __('admin/custom.logo_' . $position) }}</option>
                                @endforeach
                            </select>
                            <p class="text-muted">{{ __('admin/custom.logo_position_help') }}</p>
                        </div>
                    </fieldset>
                    @include('admin.settings.partials.appearance-background', ['area' => 'login'])
                </div>
            </section>
            <section class="box" id="appearance-client">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/custom.client_background') }}</h3></div>
                <div class="box-body">@include('admin.settings.partials.appearance-background', ['area' => 'client'])</div>
            </section>
        </div>
        <aside class="appearance-preview-panel">
            <div class="box">
                <div class="box-header with-border appearance-preview-toolbar">
                    <h3 class="box-title">{{ __('admin/custom.live_preview') }}</h3>
                    <div class="appearance-device-options" role="group" aria-label="{{ __('admin/custom.preview_size') }}">
                        <button type="button" class="btn btn-default btn-sm" data-device="desktop" aria-pressed="true">{{ __('admin/custom.desktop') }}</button>
                        <button type="button" class="btn btn-default btn-sm" data-device="mobile" aria-pressed="false">{{ __('admin/custom.mobile') }}</button>
                    </div>
                </div>
                <div class="box-body">
                    <div class="appearance-preview-tabs" role="tablist" aria-label="{{ __('admin/custom.live_preview') }}">
                        <button id="preview-tab-login" type="button" role="tab" data-preview-tab="login" aria-selected="true" aria-controls="preview-panel-login">{{ __('admin/custom.preview_login') }}</button>
                        <button id="preview-tab-client" type="button" role="tab" data-preview-tab="client" aria-selected="false" aria-controls="preview-panel-client" tabindex="-1">{{ __('admin/custom.preview_client') }}</button>
                    </div>
                    <div id="preview-panel-login" role="tabpanel" aria-labelledby="preview-tab-login">
                        <div class="appearance-preview" id="login-preview" data-background="{{ $appearance['loginBackground']['url'] ?? '' }}" data-device="desktop" aria-label="{{ __('admin/custom.login_preview') }}">
                            <div class="appearance-preview-background"></div>
                            <div class="appearance-preview-pane" aria-hidden="true"></div>
                            <div class="appearance-preview-logo"><img src="{{ $logoUrl ?? '/branding/aquadactyl-wordmark.png' }}" alt=""><span class="preview-site-name"></span></div>
                            <div class="appearance-preview-form">
                                <strong>{{ __('admin/custom.preview_sign_in') }}</strong>
                                <span class="preview-input"></span><span class="preview-input"></span>
                                <span class="preview-button">{{ __('admin/custom.preview_sign_in') }}</span>
                            </div>
                        </div>
                    </div>
                    <div id="preview-panel-client" role="tabpanel" aria-labelledby="preview-tab-client" hidden>
                        <div class="appearance-preview appearance-client-preview" id="client-preview" data-background="{{ $appearance['clientBackground']['url'] ?? '' }}" data-device="desktop" aria-label="{{ __('admin/custom.client_preview') }}">
                            <div class="appearance-preview-background"></div>
                            <div class="preview-navigation"><span class="preview-client-brand"><img src="{{ $logoUrl ?? '/branding/aquadactyl-emblem.png' }}" alt=""><span class="preview-site-name"></span></span><span class="preview-nav-active">{{ __('admin/custom.preview_account') }}</span></div>
                            <div class="preview-subnavigation"><span>{{ __('admin/custom.preview_server') }}</span></div>
                            <div class="preview-client-card"><strong>{{ __('admin/custom.preview_server') }}</strong><span class="preview-input"></span><span class="preview-button">{{ __('admin/custom.preview_action') }}</span></div>
                        </div>
                    </div>
                    <p class="text-muted appearance-preview-help">{{ __('admin/custom.preview_help') }}</p>
                    <p class="text-muted small">{{ __('admin/custom.image_actions_help') }}</p>
                </div>
            </div>
        </aside>
    </div>
@endsection

@section('footer-scripts')
    @parent
    {!! Theme::js('js/admin/appearance.js?v=' . filemtime(public_path('themes/pterodactyl/js/admin/appearance.js'))) !!}
@endsection
