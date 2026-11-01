<details class="panel-update-notes">
    <summary class="panel-update-notes-header">
        <span><i class="fa fa-file-text-o" aria-hidden="true"></i> {{ $notesHeading }} @if($notesTag ?? null)<code>{{ $notesTag }}</code>@endif</span>
        <i class="fa fa-chevron-down panel-update-notes-chevron" aria-hidden="true"></i>
    </summary>
    <div class="panel-update-notes-body">
        @if($notesUrl ?? null)<p><a href="{{ $notesUrl }}" target="_blank" rel="noopener noreferrer">GitHub <i class="fa fa-external-link" aria-hidden="true"></i></a></p>@endif
        {!! \Illuminate\Support\Str::markdown($notesText ?: __('webhooks.no_notes'), ['html_input' => 'strip', 'allow_unsafe_links' => false]) !!}
    </div>
</details>
