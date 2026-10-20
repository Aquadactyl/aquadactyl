<section class="panel-update-notes" aria-label="{{ $notesHeading }}">
    <div class="panel-update-notes-header">
        <h4><i class="fa fa-file-text-o" aria-hidden="true"></i> {{ $notesHeading }} @if($notesTag ?? null)<code>{{ $notesTag }}</code>@endif</h4>
        @if($notesUrl ?? null)<a href="{{ $notesUrl }}" target="_blank" rel="noopener noreferrer">GitHub <i class="fa fa-external-link" aria-hidden="true"></i></a>@endif
    </div>
    <div class="panel-update-notes-body">{!! \Illuminate\Support\Str::markdown($notesText ?: __('webhooks.no_notes'), ['html_input' => 'strip', 'allow_unsafe_links' => false]) !!}</div>
</section>
