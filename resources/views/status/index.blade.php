<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta http-equiv="refresh" content="60">
    <title>{{ __('integrations.status.heading') }} - {{ $title }}</title>
    @include('partials.favicons')
    @include('partials.fonts')
    @include('partials.appearance')
    <link rel="stylesheet" href="/themes/pterodactyl/css/status.css?v={{ filemtime(public_path('themes/pterodactyl/css/status.css')) }}">
</head>
<body>
    <header class="status-navigation"><a class="status-brand" href="/">@if(config('aquadactyl.branding.logo_path'))<img src="{{ '/storage/' . config('aquadactyl.branding.logo_path') }}" alt="">@else<img src="/branding/aquadactyl-emblem.png" alt="">@endif<span>{{ config('app.name') }}</span></a><a href="{{ auth()->check() ? '/' : '/auth/login' }}">{{ auth()->check() ? __('integrations.status.back_panel') : __('integrations.status.sign_in') }} <span aria-hidden="true">&rarr;</span></a></header>
    <main class="status-shell">
        <div class="status-page-heading"><p class="status-eyebrow">{{ __('integrations.status.heading') }}</p><h1>{{ $title }}</h1>@if($description)<p class="status-description">{{ $description }}</p>@endif</div>
        <section class="status-overall status-{{ $overall }}" aria-labelledby="overall-title"><span class="status-dot" aria-hidden="true"></span><div><h2 id="overall-title">{{ __('integrations.status.overall_' . $overall) }}</h2><p>{{ __('integrations.status.refresh_help') }}</p></div><a href="/status" class="status-refresh">{{ __('integrations.status.refresh') }} &orarr;</a></section>
        @if(config('aquadactyl.maintenance.enabled'))<aside class="status-notice"><strong>{{ __('integrations.status.panel_maintenance') }}</strong><p>{{ config('aquadactyl.maintenance.message') ?: __('admin/operations.maintenance_default') }}</p></aside>@endif
        <section aria-labelledby="components-heading"><h2 class="status-section-title" id="components-heading">{{ __('integrations.status.components') }}</h2>
            <div class="status-components">@forelse($components as $component)
                <article class="status-component status-{{ $component['status'] }}"><div class="status-component-heading"><h3>{{ $component['name'] }}</h3><span class="status-pill"><span class="status-dot" aria-hidden="true"></span>{{ __('integrations.status.' . $component['status']) }}</span></div><div class="status-component-details"><span>{{ __('integrations.status.last_checked') }}: {{ $component['checked_at']?->diffForHumans() ?? __('integrations.status.awaiting') }}</span><strong>{{ $component['availability'] !== null ? number_format($component['availability'], 2) . '%' : '—' }}</strong></div><p class="status-sampling">{{ __('integrations.status.availability_help') }}</p></article>
            @empty<div class="status-empty">{{ __('integrations.status.no_components') }}</div>@endforelse</div>
            <p class="status-footnote">{{ __('integrations.status.measurement_help') }}</p>
        </section>
        <section aria-labelledby="incidents-heading"><h2 class="status-section-title" id="incidents-heading">{{ __('integrations.status.incidents') }}</h2>
            @forelse($active as $incident)@include('status.incident')@empty<div class="status-empty">{{ __('integrations.status.no_incidents') }}</div>@endforelse
        </section>
        @if($resolved->isNotEmpty())<section aria-labelledby="resolved-heading"><h2 class="status-section-title" id="resolved-heading">{{ __('integrations.status.recently_resolved') }}</h2>@foreach($resolved as $incident)@include('status.incident')@endforeach</section>@endif
        <footer class="status-footer">{{ __('integrations.status.powered_by') }} <a href="https://aquadactyl.uk" rel="noopener noreferrer" target="_blank">Aquadactyl</a></footer>
    </main>
</body>
</html>
