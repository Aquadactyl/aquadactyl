<style id="panel-appearance">
    html:root {
        @foreach(app(\Pterodactyl\Services\Settings\AppearanceService::class)->cssVariables() as $property => $value)
            {{ $property }}: {{ $value }};
        @endforeach
    }
</style>
