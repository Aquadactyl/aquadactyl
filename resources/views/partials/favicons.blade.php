@inject('branding', 'Pterodactyl\Services\Settings\SiteBrandingService')
@inject('pwa', 'Pterodactyl\Services\Settings\PwaService')
<link rel="icon" type="image/png" sizes="32x32" href="{{ $branding->iconUrl(32) }}">
<link rel="icon" type="image/png" sizes="16x16" href="{{ $branding->iconUrl(16) }}">
<link rel="shortcut icon" type="image/vnd.microsoft.icon" href="{{ $branding->url('favicon.ico') }}">
<link rel="apple-touch-icon" sizes="180x180" href="{{ $branding->iconUrl(180) }}">
<link rel="mask-icon" href="{{ $branding->url('mask-icon.svg') }}" color="#00bfff">
<meta name="application-name" content="{{ $pwa->appName() }}">
@if($pwa->enabled())
<meta name="apple-mobile-web-app-title" content="{{ $pwa->shortName() }}">
<link rel="manifest" href="{{ $branding->url('manifest.webmanifest') }}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
@endif
<script src="/pwa/register.js?v={{ filemtime(public_path('pwa/register.js')) }}" data-pwa-enabled="{{ $pwa->enabled() ? 'true' : 'false' }}" data-pwa-offline="{{ $pwa->offlineEnabled() ? 'true' : 'false' }}" defer></script>
<meta name="msapplication-config" content="{{ $branding->url('browserconfig.xml') }}">
<meta name="msapplication-TileColor" content="#11161b">
