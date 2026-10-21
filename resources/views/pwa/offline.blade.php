<!DOCTYPE html>
<html lang="{{ $locale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="robots" content="noindex">
    <title>{{ __('setup.offline_title', [], $locale) }} · {{ config('app.name') }}</title>
    <style>
        * { box-sizing: border-box; }
        body { min-height: 100vh; min-height: 100dvh; margin: 0; display: grid; place-items: center; padding: 24px; background: #11161b; color: #e5e9ed; font-family: Inter, system-ui, sans-serif; }
        main { width: 100%; max-width: 480px; padding: 36px; border: 1px solid #35404a; border-radius: 14px; background: #1c232a; text-align: center; }
        svg { width: 56px; height: 56px; color: {{ app(\Pterodactyl\Services\Settings\AppearanceService::class)->primaryColor() }}; }
        h1 { font-size: 24px; margin: 20px 0 12px; }
        p { line-height: 1.7; color: #a7b2bf; }
        button { font: inherit; padding: 12px 24px; border: 1px solid #526272; border-radius: 7px; background: #28323b; color: #e5e9ed; cursor: pointer; margin-top: 12px; }
        button:focus-visible { outline: 3px solid #8ed4d0; outline-offset: 3px; }
        small { display: block; margin-top: 24px; color: #a7b2bf; overflow-wrap: anywhere; }
    </style>
</head>
<body>
    <main>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m2 2 20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 5-2.5m5 0a10 10 0 0 1 4 2.5M2 8.5A16 16 0 0 1 6 6m4-1a16 16 0 0 1 12 3.5"/><circle cx="12" cy="20" r=".5"/></svg>
        <h1>{{ __('setup.offline_title', [], $locale) }}</h1>
        <p>{{ __('setup.offline_help', [], $locale) }}</p>
        <button type="button" id="retry">{{ __('setup.retry', [], $locale) }}</button>
        <small>{{ config('app.name') }}</small>
    </main>
    <script>document.getElementById('retry').addEventListener('click', function () { window.location.reload(); });</script>
</body>
</html>
