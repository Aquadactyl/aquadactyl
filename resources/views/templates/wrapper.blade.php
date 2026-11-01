@include('blueprint.dashboard.dashboard')
@yield('blueprint.lib')

<!DOCTYPE html>
<html class="{{ Auth::user()?->shouldBlurSensitiveData() ? 'privacy-mode' : '' }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ app(\Pterodactyl\Services\Users\LanguageService::class)->available()[app()->getLocale()]['direction'] ?? 'ltr' }}">
    <head>
        <title>{{ config('app.name', 'Aquadactyl') }}</title>

        @yield('head')

        @section('meta')
            <meta charset="utf-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta content="width=device-width, initial-scale=1" name="viewport">
            <meta name="csrf-token" content="{{ csrf_token() }}">
            <meta name="robots" content="noindex">
            @include('partials.favicons')
            <meta name="theme-color" content="{{ app(\Pterodactyl\Services\Settings\AppearanceService::class)->primaryColor() }}">
            <meta name="color-scheme" content="dark">
            @include('partials.fonts')
            @include('partials.client-preloads')
        @show

        @section('user-data')
            <script>
                window.PanelLocalization = {{ \Illuminate\Support\Js::from([
                    'languages' => app(\Pterodactyl\Services\Users\LanguageService::class)->available(),
                    'locale' => app()->getLocale(),
                    'fallbackLocale' => config('app.fallback_locale', 'en'),
                    'revision' => app(\Pterodactyl\Services\Users\LanguageService::class)->revision(),
                    'resources' => app(\Pterodactyl\Services\Users\LanguageService::class)->initialResources(),
                ]) }};
            </script>
            @if(!is_null(Auth::user()))
                <script>
                    window.PterodactylUser = {!! \Illuminate\Support\Js::encode(Auth::user()->toVueObject()) !!};
                </script>
            @endif
            @if(!empty($siteConfiguration))
                <script>
                    window.SiteConfiguration = {!! \Illuminate\Support\Js::encode($siteConfiguration) !!};
                </script>
            @endif
        @show

        @yield('assets')

        @include('layouts.scripts')
        @include('partials.appearance')
    </head>
    <body class="{{ $css['body'] ?? 'bg-neutral-50' }}">
        @section('content')
            @yield('above-container')
            @yield('container')
            @yield('below-container')

            @yield('blueprint.wrappers')
        @show
        @section('scripts')
            @viteReactRefresh
            @vite(['resources/scripts/index.tsx'])
        @show
    </body>
</html>
