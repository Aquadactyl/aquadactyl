@include('blueprint.dashboard.dashboard')
@yield('blueprint.lib')

<!DOCTYPE html>
<html class="{{ Auth::user()?->shouldBlurSensitiveData() ? 'privacy-mode' : '' }}">
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
            <meta name="theme-color" content="#11161b">
            <meta name="color-scheme" content="dark">
        @show

        @section('user-data')
            @if(!is_null(Auth::user()))
                <script>
                    window.PterodactylUser = {!! json_encode(Auth::user()->toVueObject()) !!};
                </script>
            @endif
            @if(!empty($siteConfiguration))
                <script>
                    window.SiteConfiguration = {!! json_encode($siteConfiguration) !!};
                </script>
            @endif
        @show

        @yield('assets')

        @include('layouts.scripts')
        <link rel="stylesheet" href="/css/privacy.css?v={{ filemtime(public_path('css/privacy.css')) }}">
    </head>
    <body class="{{ $css['body'] ?? 'bg-neutral-50' }}">
        @section('content')
            @yield('above-container')
            @yield('container')
            @yield('below-container')

            @yield('blueprint.wrappers')
        @show
        @section('scripts')
            {!! $asset->js('main.js') !!}
        @show
    </body>
</html>
