@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.egg_library_1aa5f1') }} {{ $egg['name'] }}
@endsection

@section('content-header')
    <h1>{{ $egg['name'] }}<small>{{ __('admin/ui.preview_and_import_this_egg') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.egg-library.index') }}">{{ __('admin/ui.egg_library') }}</a></li>
        <li class="active">{{ __('admin/ui.preview') }}</li>
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
                    <p class="egg-library-description">{{ $egg['description'] ?? __('admin/ui.no_description') }}</p>
                    <p class="text-muted">{{ ucfirst($metadata['source']) }} · {{ $metadata['repo'] }} · {{ ucfirst($metadata['category']) }}</p>
                    <p><strong>{{ __('admin/ui.author') }}</strong> {{ $egg['author'] }} &nbsp; <strong>{{ __('admin/ui.format') }}</strong> {{ $egg['meta']['version'] }}</p>
                    <div class="egg-library-actions">
                        <a class="btn btn-default" href="{{ route('admin.egg-library.download', ['slug' => $slug]) }}"><i class="fa fa-download" aria-hidden="true"></i> {{ __('admin/ui.download_json') }}</a>
                        <a class="btn btn-default" href="https://eggs.download/egg/{{ $slug }}" target="_blank" rel="noopener noreferrer">{{ __('admin/ui.view_on_eggs_download') }} <i class="fa fa-external-link" aria-hidden="true"></i></a>
                    </div>
                </div>
            </div>
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/ui.server_settings') }}</h3></div>
                <div class="box-body">
                    <h4>{{ __('admin/ui.docker_images') }}</h4>
                    @forelse(($egg['docker_images'] ?? []) as $label => $image)
                        <p><code>{{ $image }}</code></p>
                    @empty
                        <p><code>{{ is_string($egg['image'] ?? null) ? $egg['image'] : __('admin/ui.not_provided') }}</code></p>
                    @endforelse
                    <h4>{{ __('admin/ui.startup_command') }}</h4>
                    <pre>{{ $egg['startup'] ?? __('admin/ui.not_provided') }}</pre>
                    <details class="egg-library-details">
                        <summary>{{ __('admin/ui.installation_script') }}</summary>
                        <pre>{{ $egg['scripts']['installation']['script'] ?? __('admin/ui.not_provided') }}</pre>
                    </details>
                    <details class="egg-library-details">
                        <summary>{{ __('admin/ui.environment_variables') }}{{ count($egg['variables'] ?? []) }})</summary>
                        <pre>{{ json_encode($egg['variables'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) }}</pre>
                    </details>
                    @if($readme)
                        <details class="egg-library-details">
                            <summary>{{ __('admin/ui.setup_notes_from_the_repository') }}</summary>
                            <pre>{{ $readme }}</pre>
                        </details>
                    @endif
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">{{ __('admin/ui.add_to_your_panel') }}</h3></div>
                <div class="box-body">
                    @if(!$compatible)
                        <div class="alert alert-warning">{{ __('admin/ui.this_format_cannot_be_imported_into_aquadactyl_choose_an_egg_using_ptdl_v1_or_ptdl_v2') }}</div>
                    @else
                        <p class="text-muted">{{ __('admin/ui.choose_a_nest_to_make_this_egg_available_when_creating_servers') }}</p>
                        <form action="{{ route('admin.egg-library.import', ['slug' => $slug]) }}" method="POST" id="egg-import-form" data-existing-eggs="{{ $existingEggs->toJson() }}" data-egg-view-url="{{ url('/admin/nests/egg') }}">
                            @csrf
                            <input type="hidden" name="egg_hash" value="{{ $eggHash }}">
                            <div class="form-group">
                                <label for="egg-nest">{{ __('admin/ui.destination_nest') }}</label>
                                <select name="nest_id" id="egg-nest" class="form-control egg-library-select" required>
                                    <option value="">{{ __('admin/ui.choose_a_nest') }}</option>
                                    @foreach($nests as $nest)
                                        <option value="{{ $nest->id }}" {{ (string) old('nest_id') === (string) $nest->id ? 'selected' : '' }}>{{ $nest->name }}</option>
                                    @endforeach
                                    <option value="new" {{ old('nest_id') === 'new' || $nests->isEmpty() ? 'selected' : '' }}>{{ __('admin/ui.create_a_new_nest') }}</option>
                                </select>
                            </div>
                            <div class="form-group" id="egg-new-nest" hidden>
                                <label for="egg-new-nest-name">{{ __('admin/ui.new_nest_name') }}</label>
                                <input type="text" name="new_nest_name" id="egg-new-nest-name" class="form-control" maxlength="191" value="{{ old('new_nest_name', 'Downloaded Eggs') }}">
                            </div>
                            <p id="egg-existing-note" class="text-muted" hidden>{{ __('admin/ui.this_egg_is_already_available_in_the_selected_nest') }}</p>
                            <button type="submit" class="btn btn-primary btn-block" id="egg-import-button">{{ __('admin/ui.import_egg') }}</button>
                            <a class="btn btn-primary btn-block" id="egg-existing-link" hidden>{{ __('admin/ui.open_existing_egg') }}</a>
                        </form>
                    @endif
                </div>
                <div class="box-footer"><a href="{{ route('admin.egg-library.index') }}">{{ __('admin/ui.back_to_egg_library') }}</a></div>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script src="/themes/pterodactyl/js/admin/egg-library.js?v={{ filemtime(public_path('themes/pterodactyl/js/admin/egg-library.js')) }}"></script>
@endsection
