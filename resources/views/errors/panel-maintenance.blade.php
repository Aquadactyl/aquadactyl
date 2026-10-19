@php
    $appearance = app(\Pterodactyl\Services\Settings\AppearanceService::class)->publicSettings();
    $background = $appearance['loginBackground'];
    $logoPath = config('aquadactyl.branding.logo_path');
    $customLogo = is_string($logoPath) && preg_match('/\Abranding\/[a-f0-9-]+\.png\z/', $logoPath);
    $siteName = config('app.name', 'Aquadactyl');
    $defaultBrand = strtolower(trim($siteName)) === 'aquadactyl';
    $preview = $preview ?? false;
@endphp
<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#11161b">
    <title>{{ __('admin/operations.maintenance') }} - {{ $siteName }}</title>
    @include('partials.favicons')
    @include('partials.fonts')
    <link rel="stylesheet" href="/themes/pterodactyl/css/maintenance.css?v={{ filemtime(public_path('themes/pterodactyl/css/maintenance.css')) }}">
    @include('partials.appearance')
</head>
<body>
    @if($background['url'])
        <div class="maintenance-background" aria-hidden="true" style="background-image: url('{{ $background['url'] }}'); filter: blur({{ $background['blur'] }}px);"></div>
        <div class="maintenance-overlay" aria-hidden="true" style="background-color: rgb(17 22 27 / {{ $background['overlay'] }}%);"></div>
    @endif
    @if($preview)
        <aside class="maintenance-preview" aria-label="{{ __('admin/operations.preview_maintenance') }}">
            <span><strong>{{ __('admin/operations.preview') }}</strong> {{ __('admin/operations.preview_help') }}</span>
            <a href="{{ route('admin.settings', [], false) }}">{{ __('admin/operations.back_to_settings') }} &rarr;</a>
        </aside>
    @endif
    <main class="maintenance-shell">
        <header class="maintenance-brand" aria-label="{{ $siteName }}">
            @if($customLogo)
                <img class="maintenance-logo" src="{{ '/storage/' . $logoPath }}" alt="{{ config('aquadactyl.branding.show_name') ? '' : $siteName }}">
                @if(config('aquadactyl.branding.show_name'))<span>{{ $siteName }}</span>@endif
            @elseif($defaultBrand)
                <img class="maintenance-wordmark" src="/branding/aquadactyl-wordmark.png" alt="Aquadactyl" width="232">
            @else
                <img class="maintenance-emblem" src="/branding/aquadactyl-emblem.png" alt="" width="48" height="48">
                <span>{{ $siteName }}</span>
            @endif
        </header>
        <section class="maintenance-card" aria-labelledby="maintenance-title">
            <div class="maintenance-server" aria-hidden="true"><span><i></i><b></b></span><span><i></i><b></b></span><span><i></i><b></b></span></div>
            <div class="maintenance-status"><span aria-hidden="true"></span>{{ __('admin/operations.maintenance_in_progress') }}</div>
            <h1 id="maintenance-title">{{ __('admin/operations.back_shortly') }}</h1>
            <p class="maintenance-message">{{ $message }}</p>
            <p class="maintenance-reassurance">{{ __('admin/operations.servers_keep_running') }}</p>
            <div class="maintenance-actions">
                <a class="maintenance-button maintenance-button-primary" href="/">{{ __('admin/operations.try_again') }}</a>
                <a class="maintenance-button maintenance-button-secondary" href="/auth/login">{{ __('admin/operations.admin_sign_in') }} <span aria-hidden="true">&rarr;</span></a>
            </div>
            <p class="maintenance-admin-help">{{ __('admin/operations.admin_access_help') }}</p>
        </section>
        <footer class="maintenance-footer">{{ __('admin/operations.powered_by') }} <a href="https://aquadactyl.uk" target="_blank" rel="noopener noreferrer">Aquadactyl</a></footer>
    </main>
</body>
</html>
