@php($notesText = $installedNotes ?? app(\Pterodactyl\Services\Updates\ReleaseNotes::class)->installed())
<details class="panel-update-notes{{ ($compactNotes ?? false) ? ' panel-update-notes-compact' : '' }}">
    <summary><i class="fa fa-file-text-o" aria-hidden="true"></i> {{ __('webhooks.installed_notes') }} <i class="fa fa-angle-down" aria-hidden="true"></i></summary>
    <div class="panel-update-notes-body">{!! \Illuminate\Support\Str::markdown($notesText ?: __('webhooks.no_notes'), ['html_input' => 'strip', 'allow_unsafe_links' => false]) !!}</div>
</details>
