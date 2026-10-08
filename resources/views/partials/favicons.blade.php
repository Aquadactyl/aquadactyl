@inject('branding', 'Pterodactyl\Services\Settings\SiteBrandingService')
<link rel="icon" type="image/png" sizes="32x32" href="{{ $branding->iconUrl(32) }}">
<link rel="icon" type="image/png" sizes="16x16" href="{{ $branding->iconUrl(16) }}">
<link rel="shortcut icon" type="image/vnd.microsoft.icon" href="{{ $branding->url('favicon.ico') }}">
<link rel="apple-touch-icon" sizes="180x180" href="{{ $branding->iconUrl(180) }}">
<link rel="mask-icon" href="{{ $branding->url('mask-icon.svg') }}" color="#00bfff">
<link rel="manifest" href="{{ $branding->url('manifest.webmanifest') }}">
<meta name="application-name" content="{{ config('app.name', 'Aquadactyl') }}">
<meta name="apple-mobile-web-app-title" content="{{ config('app.name', 'Aquadactyl') }}">
<meta name="msapplication-config" content="{{ $branding->url('browserconfig.xml') }}">
<meta name="msapplication-TileColor" content="#11161b">
