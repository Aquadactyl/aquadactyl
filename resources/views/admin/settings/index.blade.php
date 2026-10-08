@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'basic'])

@section('title')
    Settings
@endsection

@section('content-header')
    <h1>Site Settings<small>Configure your branding and the features available to users.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Settings</li>
    </ol>
@endsection

@section('content')
    @yield('settings::nav')
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Site Configuration</h3>
                </div>
                <form action="{{ route('admin.settings') }}" method="POST">
                    <div class="box-body">
                        <div class="row">
                            <div class="form-group col-lg-4">
                                <label class="control-label" for="site-name">Site Name</label>
                                <div>
                                    <input id="site-name" type="text" class="form-control" name="app:name" value="{{ old('app:name', config('app.name')) }}" required maxlength="191" />
                                    <p class="text-muted"><small>This is the name that is used throughout the panel and in emails sent to clients.</small></p>
                                    <label class="control-label" for="show-site-name">Show Site Name Beside Logo</label>
                                    @php
                                        $showName = in_array(old('aquadactyl:branding:show_name', config('aquadactyl.branding.show_name', false)), [true, 'true', 1, '1'], true);
                                    @endphp
                                    <select id="show-site-name" class="form-control" name="aquadactyl:branding:show_name">
                                        <option value="false" @if(!$showName) selected @endif>Logo only</option>
                                        <option value="true" @if($showName) selected @endif>Logo and site name</option>
                                    </select>
                                    <p class="text-muted"><small>Show the site name alongside an uploaded logo in navigation, sign-in and admin headers.</small></p>
                                </div>
                            </div>
                            <div class="form-group col-lg-4">
                                <label class="control-label">Require 2-Factor Authentication</label>
                                <div>
                                    <div class="btn-group" data-toggle="buttons">
                                        @php
                                            $level = old('pterodactyl:auth:2fa_required', config('pterodactyl.auth.2fa_required'));
                                        @endphp
                                        <label class="btn btn-primary @if ($level == 0) active @endif">
                                            <input type="radio" name="pterodactyl:auth:2fa_required" autocomplete="off" value="0" @if ($level == 0) checked @endif> Not Required
                                        </label>
                                        <label class="btn btn-primary @if ($level == 1) active @endif">
                                            <input type="radio" name="pterodactyl:auth:2fa_required" autocomplete="off" value="1" @if ($level == 1) checked @endif> Admin Only
                                        </label>
                                        <label class="btn btn-primary @if ($level == 2) active @endif">
                                            <input type="radio" name="pterodactyl:auth:2fa_required" autocomplete="off" value="2" @if ($level == 2) checked @endif> All Users
                                        </label>
                                    </div>
                                    <p class="text-muted"><small>If enabled, any account falling into the selected grouping will be required to have 2-Factor authentication enabled to use the Panel.</small></p>
                                </div>
                            </div>
                            <div class="form-group col-lg-4">
                                <label class="control-label">Default Language</label>
                                <div>
                                    <select name="app:locale" class="form-control">
                                        @foreach($languages as $key => $value)
                                            <option value="{{ $key }}" @if(old('app:locale', config('app.locale')) === $key) selected @endif>{{ $value }}</option>
                                        @endforeach
                                    </select>
                                    <p class="text-muted"><small>The default language to use when rendering UI components.</small></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="box-body site-feature-settings">
                        <h4>Site-wide Features</h4>
                        <p class="text-muted">These controls apply to all users. Changes take effect when a page is reloaded.</p>
                        @php
                            $features = [
                                'player_counts' => ['Player Counts', 'Show game player counts on server cards. Disabling this also stops game server queries.'],
                                'custom_profile_pictures' => ['Custom Profile Pictures', 'Allow users to upload and display their own profile pictures. Saved pictures are retained while disabled.'],
                                'privacy_mode' => ['Sensitive Data Blur', 'Allow users to blur sensitive text until hovered or focused. Saved preferences are retained while disabled.'],
                                'server_quick_actions' => ['Server Quick Actions', 'Show console, files and power shortcuts on server cards. Users can still manage servers from their server pages.'],
                            ];
                        @endphp
                        <div class="row">
                            @foreach($features as $key => [$label, $description])
                                @php
                                    $field = 'aquadactyl:features:' . $key;
                                    $enabled = in_array(old($field, config('aquadactyl.features.' . $key, true)), [true, 'true', 1, '1'], true);
                                @endphp
                                <div class="form-group col-md-6">
                                    <label class="control-label" for="feature-{{ $key }}">{{ $label }}</label>
                                    <select class="form-control" id="feature-{{ $key }}" name="{{ $field }}">
                                        <option value="true" @if($enabled) selected @endif>Enabled</option>
                                        <option value="false" @if(!$enabled) selected @endif>Disabled</option>
                                    </select>
                                    <p class="text-muted"><small>{{ $description }}</small></p>
                                </div>
                            @endforeach
                        </div>
                    </div>
                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" name="_method" value="PATCH" class="btn btn-sm btn-primary pull-right">Save Site Settings</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">Site Logo</h3></div>
                <div class="box-body">
                    <p class="text-muted">Use your logo on the sign-in page, navigation bar, admin area, browser tabs and home-screen shortcuts. Upload a PNG, JPEG or WebP up to 2 MB and 4096 pixels per side. Proportions and transparency are preserved; square logos work best for icons.</p>
                    <div class="site-logo-preview">
                        <img src="{{ config('aquadactyl.branding.logo_path') ? '/storage/' . config('aquadactyl.branding.logo_path') : '/branding/aquadactyl-wordmark.png' }}" alt="Current site logo">
                    </div>
                    <form action="{{ route('admin.settings.logo') }}" method="POST" enctype="multipart/form-data">
                        {!! csrf_field() !!}
                        <div class="form-group">
                            <label for="site-logo">Logo File</label>
                            <input id="site-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" required>
                        </div>
                        <button type="submit" class="btn btn-sm btn-primary">Upload Logo</button>
                    </form>
                    @if(config('aquadactyl.branding.logo_path'))
                        <form action="{{ route('admin.settings.logo') }}" method="POST" style="margin-top:12px;">
                            {!! csrf_field() !!}
                            {!! method_field('DELETE') !!}
                            <button type="submit" class="btn btn-sm btn-default">Restore Default Logo</button>
                        </form>
                    @endif
                </div>
            </div>
        </div>
    </div>
@endsection
