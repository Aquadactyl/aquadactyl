@include("blueprint.admin.admin")
@yield('blueprint.lib')

<!DOCTYPE html>
<html class="{{ Auth::user()?->shouldBlurSensitiveData() ? 'privacy-mode' : '' }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ app(\Pterodactyl\Services\Users\LanguageService::class)->available()[app()->getLocale()]['direction'] ?? 'ltr' }}">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>{{ config('app.name', 'Aquadactyl') }} - @yield('title')</title>
        <meta content="width=device-width, initial-scale=1" name="viewport">
        <meta name="_token" content="{{ csrf_token() }}">

        @include('partials.favicons')
        <meta name="theme-color" content="#11161b">
        <meta name="color-scheme" content="dark">
        @include('partials.fonts')

        @include('layouts.scripts')

        @section('scripts')
            {!! Theme::css('vendor/select2/select2.min.css?t={cache-version}') !!}
            {!! Theme::css('vendor/bootstrap/bootstrap.min.css?t={cache-version}') !!}
            {!! Theme::css('vendor/adminlte/admin.min.css?t={cache-version}') !!}
            {!! Theme::css('vendor/adminlte/colors/skin-blue.min.css?t={cache-version}') !!}
            {!! Theme::css('vendor/sweetalert/sweetalert.min.css?t={cache-version}') !!}
            {!! Theme::css('vendor/animate/animate.min.css?t={cache-version}') !!}
            {!! Theme::css('css/index.css?v=' . filemtime(public_path('themes/pterodactyl/css/index.css'))) !!}
            {!! Theme::css('css/appearance.css?v=' . filemtime(public_path('themes/pterodactyl/css/appearance.css'))) !!}
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ionicons/2.0.1/css/ionicons.min.css">

            <!--[if lt IE 9]>
            <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
            <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
            <![endif]-->
        @show

        @yield("blueprint.import")
        {!! Theme::css('css/admin.css?v=' . filemtime(public_path('themes/pterodactyl/css/admin.css'))) !!}
        @include('partials.appearance')
    </head>
    <body class="hold-transition skin-blue fixed sidebar-mini aquadactyl-admin">
        @yield('blueprint.cache')
        <div class="wrapper">
            <header class="main-header">
                <a href="{{ route('index') }}" class="logo" aria-label="{{ config('app.name', 'Aquadactyl') }}">
                    <span class="logo-mini"><img src="{{ config('aquadactyl.branding.logo_path') ? '/storage/' . config('aquadactyl.branding.logo_path') : '/branding/aquadactyl-emblem.png' }}" alt=""></span>
                    <span class="logo-lg">
                        @if(config('aquadactyl.branding.logo_path'))
                            @if(config('aquadactyl.branding.show_name', false))
                                <span class="brand-with-name">
                                    <img class="custom-site-logo" src="{{ '/storage/' . config('aquadactyl.branding.logo_path') }}" alt="">
                                    <span class="custom-site-name" title="{{ config('app.name') }}">{{ config('app.name') }}</span>
                                </span>
                            @else
                                <img class="custom-site-logo" src="{{ '/storage/' . config('aquadactyl.branding.logo_path') }}" alt="{{ config('app.name') }}">
                            @endif
                        @elseif(strtolower(trim(config('app.name', 'Aquadactyl'))) === 'aquadactyl')
                            <img src="/branding/aquadactyl-wordmark.png" alt="Aquadactyl">
                        @else
                            {{ config('app.name', 'Aquadactyl') }}
                        @endif
                    </span>
                </a>
                <nav class="navbar navbar-static-top">
                    <a href="#" class="sidebar-toggle" data-toggle="push-menu" role="button">
                        <span class="sr-only">{{ __('admin/ui.toggle_navigation') }}</span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </a>
                    <div class="navbar-custom-menu">
                        <ul class="nav navbar-nav">
                            <li class="user-menu">
                                <a href="{{ route('account') }}">
                                    <img src="{{ Auth::user()->avatar_url ?? 'https://www.gravatar.com/avatar/' . md5(strtolower(Auth::user()->email)) . '?s=160' }}" class="user-image" style="object-fit:cover;" alt="{{ __('admin/ui.your_profile_picture') }}">
                                    <span class="hidden-xs">{{ Auth::user()->name_first }} {{ Auth::user()->name_last }}</span>
                                </a>
                            </li>
                            @yield("blueprint.navigation")
                            <li>
                                <a href="{{ route('index') }}" aria-label="{{ __('admin/ui.back_to_servers') }}" data-toggle="tooltip" data-placement="bottom" title="{{ __('admin/ui.back_to_servers') }}"><i class="fa fa-server" aria-hidden="true"></i></a>
                            </li>
                            <li>
                                <a href="{{ route('auth.logout') }}" id="logoutButton" aria-label="{{ __('admin/ui.sign_out') }}" data-toggle="tooltip" data-placement="bottom" title="{{ __('admin/ui.sign_out') }}"><i class="fa fa-sign-out" aria-hidden="true"></i></a>
                            </li>
                        </ul>
                    </div>
                </nav>
            </header>
            <aside class="main-sidebar">
                <section class="sidebar">
                    <ul class="sidebar-menu">
                        <li class="header">{{ __('admin/ui.basic_administration') }}</li>
                        <li class="{{ Route::currentRouteName() !== 'admin.index' ?: 'active' }}">
                            <a href="{{ route('admin.index') }}">
                                <i class="fa fa-home"></i> <span>{{ __('admin/ui.overview') }}</span>
                            </a>
                        </li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.settings') ?: 'active' }}">
                            <a href="{{ route('admin.settings')}}">
                                <i class="fa fa-wrench"></i> <span>{{ __('admin/ui.settings') }}</span>
                            </a>
                        </li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.api') ?: 'active' }}">
                            <a href="{{ route('admin.api.index')}}">
                                <i class="fa fa-gamepad"></i> <span>{{ __('admin/ui.application_api') }}</span>
                            </a>
                        </li>
                        <li class="header">{{ __('admin/ui.management') }}</li>
                        <li class="{{ request()->is('admin/audit-logs*') ? 'active' : '' }}"><a href="{{ route('admin.audit-logs', [], false) }}"><i class="fa fa-history" aria-hidden="true"></i> <span>{{ __('admin/management.audit_logs') }}</span></a></li>
                        @yield("blueprint.sidenav")
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.databases') ?: 'active' }}">
                            <a href="{{ route('admin.databases') }}">
                                <i class="fa fa-database"></i> <span>{{ __('admin/ui.databases') }}</span>
                            </a>
                        </li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.locations') ?: 'active' }}">
                            <a href="{{ route('admin.locations') }}">
                                <i class="fa fa-globe"></i> <span>{{ __('admin/ui.locations') }}</span>
                            </a>
                        </li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.nodes') ?: 'active' }}">
                            <a href="{{ route('admin.nodes') }}">
                                <i class="fa fa-sitemap"></i> <span>{{ __('admin/ui.nodes') }}</span>
                            </a>
                        </li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.servers') ?: 'active' }}">
                            <a href="{{ route('admin.servers') }}">
                                <i class="fa fa-server"></i> <span>{{ __('admin/ui.servers') }}</span>
                            </a>
                        </li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.users') ?: 'active' }}">
                            <a href="{{ route('admin.users') }}">
                                <i class="fa fa-users"></i> <span>{{ __('admin/ui.users') }}</span>
                            </a>
                        </li>
                        <li class="header">{{ __('admin/ui.service_management') }}</li>
                        <li class="{{ request()->is('admin/daemon-stats*') ? 'active' : '' }}">
                            <a href="{{ route('admin.daemon-stats', [], false) }}"><i class="fa fa-heartbeat"></i> <span>{{ __('admin/operations.daemon_stats') }}</span></a>
                        </li>
                        <li class="{{ request()->is('admin/subdomains*') ? 'active' : '' }}">
                            <a href="{{ route('admin.subdomains', [], false) }}"><i class="fa fa-globe"></i> <span>{{ __('admin/operations.subdomains') }}</span></a>
                        </li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.mounts') ?: 'active' }}">
                            <a href="{{ route('admin.mounts') }}">
                                <i class="fa fa-magic"></i> <span>{{ __('admin/ui.mounts') }}</span>
                            </a>
                        </li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.nests') ?: 'active' }}">
                            <a href="{{ route('admin.nests') }}">
                                <i class="fa fa-th-large"></i> <span>{{ __('admin/ui.nests') }}</span>
                            </a>
                        </li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.egg-library') ?: 'active' }}">
                            <a href="{{ route('admin.egg-library.index') }}">
                                <i class="fa fa-download"></i> <span>{{ __('admin/ui.egg_library') }}</span>
                            </a>
                        </li>
                    </ul>
                </section>
            </aside>
            <div class="content-wrapper">
                <section class="content-header">
                    @yield('blueprint.introduction')
                    @yield('content-header')
                </section>
                <section class="content">
                    @if(config('aquadactyl.maintenance.enabled'))
                        <div class="alert alert-warning" role="status"><strong>{{ __('admin/operations.maintenance') }}</strong> &middot; <a href="/admin/settings">{{ __('admin/ui.settings') }}</a></div>
                    @endif
                    <div class="row">
                        <div class="col-xs-12">
                            @if (count($errors) > 0)
                                <div class="alert alert-danger">
                                    {{ __('admin/ui.there_was_an_error_validating_the_data_provided') }}<br><br>
                                    <ul>
                                        @foreach ($errors->all() as $error)
                                            <li>{{ $error }}</li>
                                        @endforeach
                                    </ul>
                                </div>
                            @endif
                            @foreach (Alert::getMessages() as $type => $messages)
                                @foreach ($messages as $message)
                                    <div class="alert alert-{{ $type }} alert-dismissable" role="alert">
                                        {{ $message }}
                                    </div>
                                @endforeach
                            @endforeach
                        </div>
                    </div>
                    @yield('content')
                </section>
            </div>
            <footer class="main-footer">
                <div class="admin-footer-copyright">
                    <a href="https://aquadactyl.uk">Aquadactyl</a> &middot;
                    @if(starts_with(Route::currentRouteName(), 'admin.extensions'))
                        {{ __('admin/ui.copyright_2023') }} {{ date('Y') }} <a href="https://blueprint.zip/">Blueprint Framework</a>{{ __('admin/ui.emma') }}<a href="https://prpl.wtf/">prpl.wtf</a>{{ __('admin/ui.and_contributors') }}
                    @else
                        {{ __('admin/ui.copyright_2015') }} {{ date('Y') }} <a href="https://pterodactyl.io/">Pterodactyl Software</a>
                    @endif
                </div>
                <div class="admin-footer-meta small text-gray">
                    <div class="admin-footer-version"><span><strong><i class="fa fa-fw {{ $appIsGit ? 'fa-git-square' : 'fa-code-fork' }}"></i></strong> {{ $appVersion }}</span>@include('admin.partials.update-notes', ['compactNotes' => true])</div>
                    <span><strong><i class="fa fa-fw fa-clock-o"></i></strong> {{ round(microtime(true) - (defined('LARAVEL_START') ? LARAVEL_START : microtime(true)), 3) }}s</span>
                </div>
            </footer>
        </div>
        @section('footer-scripts')
            <script src="/js/keyboard.polyfill.js" type="application/javascript"></script>
            <script>keyboardeventKeyPolyfill.polyfill();</script>

            {!! Theme::js('vendor/jquery/jquery.min.js?t={cache-version}') !!}
            {!! Theme::js('vendor/sweetalert/sweetalert.min.js?t={cache-version}') !!}
            {!! Theme::js('vendor/bootstrap/bootstrap.min.js?t={cache-version}') !!}
            {!! Theme::js('vendor/slimscroll/jquery.slimscroll.min.js?t={cache-version}') !!}
            {!! Theme::js('vendor/adminlte/app.min.js?t={cache-version}') !!}
            {!! Theme::js('vendor/bootstrap-notify/bootstrap-notify.min.js?t={cache-version}') !!}
            {!! Theme::js('vendor/select2/select2.full.min.js?t={cache-version}') !!}
            @include('partials.admin.translations')
            {!! Theme::js('js/admin/functions.js?t={cache-version}') !!}
            {!! Theme::js('js/admin/selects.js?v=' . filemtime(public_path('themes/pterodactyl/js/admin/selects.js'))) !!}
            <script src="/js/autocomplete.js" type="application/javascript"></script>

            @if(Auth::user()->root_admin)
                <script>
                    $('#logoutButton').on('click', function (event) {
                        event.preventDefault();

                        var that = this;
                        swal({
                            title: @json(__('admin/ui.do_you_want_to_log_out')),
                            type: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d9534f',
                            cancelButtonColor: '#d33',
                            confirmButtonText: @json(__('admin/ui.log_out'))
                        }, function () {
                             $.ajax({
                                type: 'POST',
                                url: '{{ route('auth.logout') }}',
                                data: {
                                    _token: '{{ csrf_token() }}'
                                },complete: function () {
                                    window.location.href = '{{route('auth.login')}}';
                                }
                        });
                    });
                });
                </script>
            @endif

            <script>
                $(function () {
                    $('[data-toggle="tooltip"]').tooltip();
                })
            </script>
        @show
        @yield('blueprint.wrappers')
    </body>
</html>
