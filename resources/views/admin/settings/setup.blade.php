@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'setup'])

@section('title', __('setup.title'))
@section('content-header')
    <h1>{{ __('setup.title') }}<small>{{ __('setup.subtitle') }}</small></h1>
    <ol class="breadcrumb"><li><a href="{{ route('admin.index', [], false) }}">{{ __('admin/ui.admin') }}</a></li><li class="active">{{ __('setup.title') }}</li></ol>
@endsection

@section('content')
    @yield('settings::nav')
    <div class="setup-wizard" id="setup-wizard">
        <ol class="setup-steps" aria-label="{{ __('setup.steps') }}">
            @foreach(['branding', 'node', 'admins', 'finish'] as $key)
                <li @if($step === $key) aria-current="step" @endif><a href="{{ route('admin.settings.setup', ['step' => $key], false) }}"><span>{{ $loop->iteration }}</span>{{ __('setup.' . $key) }}</a></li>
            @endforeach
        </ol>
        <section class="box setup-card">
            <div class="box-header with-border"><h2 class="box-title">{{ __('setup.' . $step) }}</h2><p class="text-muted">{{ __('setup.' . $step . '_help') }}</p></div>
            @if($step === 'branding')
                <form action="{{ route('admin.settings.setup.branding', [], false) }}" method="POST" enctype="multipart/form-data">
                    @csrf
                    <div class="box-body">
                        @if($disabled)<div class="alert alert-info">{{ __('admin/custom.environment_only') }}</div>@endif
                        <div class="setup-brand-preview"><img id="setup-logo-preview" src="{{ $logoUrl ?? '/branding/aquadactyl-wordmark.png' }}" alt="{{ __('admin/ui.current_site_logo') }}"></div>
                        <div class="form-group"><label for="setup-name">{{ __('admin/ui.site_name') }}</label><input id="setup-name" class="form-control" name="name" value="{{ old('name', config('app.name')) }}" required maxlength="191" @disabled($disabled)></div>
                        <div class="form-group"><label for="setup-logo">{{ __('setup.logo') }}</label><input id="setup-logo" class="form-control" name="logo" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="setup-logo-help" @disabled($disabled)><p id="setup-logo-help" class="help-block">{{ __('setup.logo_help') }}</p></div>
                        <div class="form-group"><label for="setup-color">{{ __('admin/custom.primary_color') }}</label><div class="setup-color"><input id="setup-color" type="color" name="primary_color" value="{{ old('primary_color', app(\Pterodactyl\Services\Settings\AppearanceService::class)->primaryColor()) }}" @disabled($disabled)><output for="setup-color">{{ old('primary_color', app(\Pterodactyl\Services\Settings\AppearanceService::class)->primaryColor()) }}</output></div></div>
                    </div>
                    <div class="box-footer setup-actions"><a class="btn btn-default" href="{{ route('admin.settings.setup', ['step' => 'node'], false) }}">{{ __('setup.keep_branding') }}</a><button class="btn btn-primary" @disabled($disabled)>{{ __('setup.save_continue') }} <i class="fa fa-arrow-right" aria-hidden="true"></i></button></div>
                </form>
            @elseif($step === 'node')
                <div class="box-body">
                    <div class="setup-tip"><i class="fa fa-info-circle" aria-hidden="true"></i><p>{{ __('setup.node_install_help') }}</p></div>
                    <button class="btn btn-primary" data-toggle="modal" data-target="#quickSetupModal"><i class="fa fa-plus" aria-hidden="true"></i> {{ __('admin/ui.create_node') }}</button>
                    @if($nodes->isNotEmpty())
                        <div class="form-group setup-node-select"><label for="setup-node">{{ __('setup.select_node') }}</label><select id="setup-node" class="form-control">@foreach($nodes as $node)<option value="{{ $node->id }}" data-test-url="{{ route('admin.settings.setup.test-node', $node->id, false) }}" data-config-url="{{ route('admin.nodes.view.configuration', $node->id, false) }}">{{ $node->name }} — {{ $node->fqdn }}</option>@endforeach</select></div>
                        <div class="setup-actions setup-node-actions"><a id="setup-node-config" class="btn btn-default" href="{{ route('admin.nodes.view.configuration', $nodes->first()->id, false) }}" target="_blank" rel="noopener">{{ __('setup.configuration') }} <i class="fa fa-external-link" aria-hidden="true"></i></a><button id="setup-test-node" class="btn btn-default" data-testing="{{ __('setup.testing') }}" data-failed="{{ __('setup.connection_failed') }}">{{ __('setup.test_connection') }}</button></div>
                        <p id="setup-connection-result" class="setup-connection-result" role="status" aria-live="polite"></p>
                    @else
                        <p class="help-block">{{ __('setup.no_nodes') }}</p>
                    @endif
                </div>
                <div class="box-footer setup-actions"><a class="btn btn-default" href="{{ route('admin.settings.setup', ['step' => 'branding'], false) }}">{{ __('setup.back') }}</a><a class="btn btn-primary" href="{{ route('admin.settings.setup', ['step' => 'admins'], false) }}">{{ __('setup.continue') }} <i class="fa fa-arrow-right" aria-hidden="true"></i></a></div>
            @elseif($step === 'admins')
                <div class="box-body">
                    <div class="setup-admin-list">@foreach($admins as $admin)<div><i class="fa fa-user-circle-o" aria-hidden="true"></i><span><strong>{{ $admin->username }}</strong><small>{{ $admin->email }}</small></span><span class="label label-default">{{ __('admin/ui.admin') }}</span></div>@endforeach</div>
                    <details class="setup-add-admin"><summary><i class="fa fa-plus" aria-hidden="true"></i> {{ __('setup.add_admin') }}</summary>
                        <form action="{{ route('admin.settings.setup.admins', [], false) }}" method="POST">
                            @csrf
                            <p class="help-block">{{ __('setup.admin_warning') }}</p>
                            <div class="row">@foreach(['name_first', 'name_last', 'username', 'email'] as $field)<div class="col-sm-6 form-group"><label for="setup-{{ $field }}">{{ __('setup.' . $field) }}</label><input id="setup-{{ $field }}" name="{{ $field }}" class="form-control" type="{{ $field === 'email' ? 'email' : 'text' }}" value="{{ old($field) }}" required maxlength="191" autocomplete="off"></div>@endforeach</div>
                            <div class="row"><div class="col-sm-6 form-group"><label for="setup-password">{{ __('setup.password') }}</label><input id="setup-password" name="password" class="form-control" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></div><div class="col-sm-6 form-group"><label for="setup-password-confirm">{{ __('setup.password_confirmation') }}</label><input id="setup-password-confirm" name="password_confirmation" class="form-control" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></div></div>
                            <div class="form-group"><label for="setup-current-password">{{ __('setup.current_password') }}</label><input id="setup-current-password" name="current_password" class="form-control" type="password" required maxlength="1024" autocomplete="current-password"></div>
                            <button class="btn btn-primary">{{ __('setup.add_admin') }}</button>
                        </form>
                    </details>
                </div>
                <div class="box-footer setup-actions"><a class="btn btn-default" href="{{ route('admin.settings.setup', ['step' => 'node'], false) }}">{{ __('setup.back') }}</a><a class="btn btn-primary" href="{{ route('admin.settings.setup', ['step' => 'finish'], false) }}">{{ __('setup.continue') }} <i class="fa fa-arrow-right" aria-hidden="true"></i></a></div>
            @else
                <div class="box-body">
                    <div class="setup-ready"><i class="fa fa-check-circle-o" aria-hidden="true"></i><h3>{{ __('setup.ready') }}</h3><p class="text-muted">{{ __('setup.ready_help') }}</p></div>
                    @if(app(\Pterodactyl\Services\Settings\PwaService::class)->enabled())
                        <div class="setup-tip"><i class="fa fa-mobile" aria-hidden="true"></i><div><strong>{{ __('setup.pwa') }}</strong><p>{{ __('setup.pwa_help') }}</p><button type="button" class="btn btn-default" data-pwa-install hidden>{{ __('setup.install_app') }}</button></div></div>
                    @endif
                </div>
                <form action="{{ route('admin.settings.setup.complete', [], false) }}" method="POST" class="box-footer setup-actions">@csrf<a class="btn btn-default" href="{{ route('admin.settings.setup', ['step' => 'admins'], false) }}">{{ __('setup.back') }}</a><button class="btn btn-primary">{{ __('setup.finish_setup') }} <i class="fa fa-check" aria-hidden="true"></i></button></form>
            @endif
        </section>
        <p class="setup-revisit text-muted">{{ __('setup.revisit') }}</p>
    </div>
    @if($step === 'node')@include('admin.partials.quick-setup', ['createNode' => true, 'wizard' => true])@endif
@endsection

@section('footer-scripts')
    @parent
    <link rel="stylesheet" href="/themes/pterodactyl/css/setup.css?v={{ filemtime(public_path('themes/pterodactyl/css/setup.css')) }}">
    <script src="/themes/pterodactyl/js/admin/setup.js?v={{ filemtime(public_path('themes/pterodactyl/js/admin/setup.js')) }}" defer></script>
@endsection
