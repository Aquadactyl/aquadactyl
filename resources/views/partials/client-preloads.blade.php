@foreach(app(\Pterodactyl\Services\Helpers\ClientAssetService::class)->preloads(request()->path()) as $module)
    <link rel="modulepreload" href="{{ $module }}" crossorigin>
@endforeach
