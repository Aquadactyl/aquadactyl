@extends('layouts.admin')

@section('title', __('admin/ui.egg_library'))

@section('content-header')
    <h1>{{ __('admin/ui.egg_library') }}<small>{{ __('admin/ui.browse_eggs_and_add_them_to_your_panel') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/ui.egg_library') }}</li>
    </ol>
@endsection

@section('content')
<div class="egg-library">
    <div class="box">
        <div class="box-header with-border">
            <h3 class="box-title">{{ __('admin/ui.find_an_egg') }}</h3>
            <a class="pull-right" href="https://eggs.download/" target="_blank" rel="noopener noreferrer">eggs.download <i class="fa fa-external-link" aria-hidden="true"></i></a>
        </div>
        <div class="box-body">
            <p class="text-muted">{{ __('admin/ui.search_games_and_applications_preview_their_settings_then_choose_a_nest_to_import_int') }}</p>
            <form action="{{ route('admin.egg-library.index') }}" method="GET" class="egg-library-filters">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="egg-search">{{ __('admin/ui.search_eggs') }}</label>
                            <input class="form-control" id="egg-search" name="q" value="{{ $query }}" maxlength="120" placeholder="{{ __('admin/ui.for_example_paper_rust_node_js') }}" type="search">
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-3">
                        <div class="form-group">
                            <label for="egg-source">{{ __('admin/ui.source') }}</label>
                            <select id="egg-source" name="source" class="form-control egg-library-select">
                                @foreach(['pterodactyl' => 'Pterodactyl', 'pelican' => 'Pelican', 'community' => __('admin/ui.community'), 'all' => __('admin/ui.all_sources')] as $value => $label)
                                    <option value="{{ $value }}" {{ $source === $value ? 'selected' : '' }}>{{ $label }}</option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-3">
                        <div class="form-group">
                            <label for="egg-category">{{ __('admin/ui.category') }}</label>
                            <select id="egg-category" name="category" class="form-control egg-library-select">
                                <option value="">{{ __('admin/ui.all_categories') }}</option>
                                @foreach($categories as $value)
                                    <option value="{{ $value }}" {{ $category === $value ? 'selected' : '' }}>{{ ucfirst(str_replace('_', ' ', $value)) }}</option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                </div>
                <div class="egg-library-actions">
                    <button type="submit" class="btn btn-primary"><i class="fa fa-search" aria-hidden="true"></i> {{ __('admin/ui.search') }}</button>
                    <a class="btn btn-default" href="{{ route('admin.egg-library.index') }}">{{ __('admin/ui.reset_filters') }}</a>
                </div>
            </form>
        </div>
    </div>
    @if($error)
        <div class="alert alert-warning" role="alert">{{ $error }} <a href="{{ request()->fullUrl() }}">{{ __('admin/ui.try_again') }}</a></div>
    @elseif($eggs->isEmpty())
        <div class="box"><div class="box-body egg-library-empty">
            <h3>{{ __('admin/ui.no_matching_eggs') }}</h3>
            <p class="text-muted">{{ __('admin/ui.try_a_different_search_category_or_source') }}</p>
        </div></div>
    @else
        <p class="text-muted">{{ __('admin/ui.showing') }} {{ $eggs->firstItem() }}–{{ $eggs->lastItem() }} of {{ $eggs->total() }} eggs.</p>
        <div class="egg-library-grid">
            @foreach($eggs as $entry)
                <article class="box egg-library-card">
                    <div class="box-body">
                        <span class="label label-default">{{ $entry['source'] === 'community' ? __('admin/ui.community') : ucfirst($entry['source']) }}</span>
                        <h3>{{ $entry['name'] }}</h3>
                        <p class="text-muted">{{ ucfirst(str_replace('_', ' ', $entry['category'])) }} · {{ $entry['repo'] }}</p>
                    </div>
                    <div class="box-footer">
                        <a class="btn btn-primary btn-block" href="{{ route('admin.egg-library.show', ['slug' => $entry['slug']]) }}">{{ __('admin/ui.preview_import') }}</a>
                    </div>
                </article>
            @endforeach
        </div>
        <div class="text-center">{!! $eggs->links() !!}</div>
    @endif
</div>
@endsection

@section('footer-scripts')
    @parent
    <script src="/themes/pterodactyl/js/admin/egg-library.js?v={{ filemtime(public_path('themes/pterodactyl/js/admin/egg-library.js')) }}"></script>
@endsection
