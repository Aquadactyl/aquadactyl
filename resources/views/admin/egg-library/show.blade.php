@extends('layouts.admin')

@section('title')
    Egg Library — {{ $egg['name'] }}
@endsection

@section('content-header')
    <h1>{{ $egg['name'] }}<small>Preview and import this egg.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.egg-library.index') }}">Egg Library</a></li>
        <li class="active">Preview</li>
    </ol>
@endsection

@section('content')
<div class="egg-library">
    <div class="row">
        <div class="col-md-8">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ $egg['name'] }}</h3>
                </div>
                <div class="box-body">
                    <p class="egg-library-description">{{ $egg['description'] ?? 'No description provided.' }}</p>
                    <p class="text-muted">{{ ucfirst($metadata['source']) }} · {{ $metadata['repo'] }} · {{ ucfirst($metadata['category']) }}</p>
                    <p><strong>Author:</strong> {{ $egg['author'] }} &nbsp; <strong>Format:</strong> {{ $egg['meta']['version'] }}</p>
                    <div class="egg-library-actions">
                        <a class="btn btn-default" href="{{ route('admin.egg-library.download', ['slug' => $slug]) }}"><i class="fa fa-download" aria-hidden="true"></i> Download JSON</a>
                        <a class="btn btn-default" href="https://eggs.download/egg/{{ $slug }}" target="_blank" rel="noopener noreferrer">View on eggs.download <i class="fa fa-external-link" aria-hidden="true"></i></a>
                    </div>
                </div>
            </div>
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">Server settings</h3></div>
                <div class="box-body">
                    <h4>Docker images</h4>
                    @forelse(($egg['docker_images'] ?? []) as $label => $image)
                        <p><code>{{ $image }}</code></p>
                    @empty
                        <p><code>{{ is_string($egg['image'] ?? null) ? $egg['image'] : 'Not provided' }}</code></p>
                    @endforelse
                    <h4>Startup command</h4>
                    <pre>{{ $egg['startup'] ?? 'Not provided' }}</pre>
                    <details class="egg-library-details">
                        <summary>Installation script</summary>
                        <pre>{{ $egg['scripts']['installation']['script'] ?? 'Not provided' }}</pre>
                    </details>
                    <details class="egg-library-details">
                        <summary>Environment variables ({{ count($egg['variables'] ?? []) }})</summary>
                        <pre>{{ json_encode($egg['variables'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) }}</pre>
                    </details>
                    @if($readme)
                        <details class="egg-library-details">
                            <summary>Setup notes from the repository</summary>
                            <pre>{{ $readme }}</pre>
                        </details>
                    @endif
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">Add to your panel</h3></div>
                <div class="box-body">
                    @if(!$compatible)
                        <div class="alert alert-warning">This format cannot be imported into Aquadactyl. Choose an egg using PTDL_v1 or PTDL_v2.</div>
                    @else
                        <p class="text-muted">Choose a nest to make this egg available when creating servers.</p>
                        <form action="{{ route('admin.egg-library.import', ['slug' => $slug]) }}" method="POST" id="egg-import-form" data-existing-eggs="{{ $existingEggs->toJson() }}" data-egg-view-url="{{ url('/admin/nests/egg') }}">
                            @csrf
                            <input type="hidden" name="egg_hash" value="{{ $eggHash }}">
                            <div class="form-group">
                                <label for="egg-nest">Destination nest</label>
                                <select name="nest_id" id="egg-nest" class="form-control egg-library-select" required>
                                    <option value="">Choose a nest</option>
                                    @foreach($nests as $nest)
                                        <option value="{{ $nest->id }}" {{ (string) old('nest_id') === (string) $nest->id ? 'selected' : '' }}>{{ $nest->name }}</option>
                                    @endforeach
                                    <option value="new" {{ old('nest_id') === 'new' || $nests->isEmpty() ? 'selected' : '' }}>Create a new nest</option>
                                </select>
                            </div>
                            <div class="form-group" id="egg-new-nest" hidden>
                                <label for="egg-new-nest-name">New nest name</label>
                                <input type="text" name="new_nest_name" id="egg-new-nest-name" class="form-control" maxlength="191" value="{{ old('new_nest_name', 'Downloaded Eggs') }}">
                            </div>
                            <p id="egg-existing-note" class="text-muted" hidden>This egg is already available in the selected nest.</p>
                            <button type="submit" class="btn btn-primary btn-block" id="egg-import-button">Import egg</button>
                            <a class="btn btn-primary btn-block" id="egg-existing-link" hidden>Open existing egg</a>
                        </form>
                    @endif
                </div>
                <div class="box-footer"><a href="{{ route('admin.egg-library.index') }}">&larr; Back to Egg Library</a></div>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script src="/themes/pterodactyl/js/admin/egg-library.js?v={{ filemtime(public_path('themes/pterodactyl/js/admin/egg-library.js')) }}"></script>
@endsection
