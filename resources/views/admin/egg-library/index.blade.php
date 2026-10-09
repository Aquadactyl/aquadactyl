@extends('layouts.admin')

@section('title', 'Egg Library')

@section('content-header')
    <h1>Egg Library<small>Browse eggs and add them to your panel.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Egg Library</li>
    </ol>
@endsection

@section('content')
<div class="egg-library">
    <div class="box">
        <div class="box-header with-border">
            <h3 class="box-title">Find an egg</h3>
            <a class="pull-right" href="https://eggs.download/" target="_blank" rel="noopener noreferrer">eggs.download <i class="fa fa-external-link" aria-hidden="true"></i></a>
        </div>
        <div class="box-body">
            <p class="text-muted">Search games and applications, preview their settings, then choose a nest to import into.</p>
            <form action="{{ route('admin.egg-library.index') }}" method="GET" class="egg-library-filters">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="egg-search">Search eggs</label>
                            <input class="form-control" id="egg-search" name="q" value="{{ $query }}" maxlength="120" placeholder="For example: Paper, Rust, Node.js" type="search">
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-3">
                        <div class="form-group">
                            <label for="egg-source">Source</label>
                            <select id="egg-source" name="source" class="form-control egg-library-select">
                                @foreach(['pterodactyl' => 'Pterodactyl', 'pelican' => 'Pelican', 'community' => 'Community', 'all' => 'All sources'] as $value => $label)
                                    <option value="{{ $value }}" {{ $source === $value ? 'selected' : '' }}>{{ $label }}</option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-3">
                        <div class="form-group">
                            <label for="egg-category">Category</label>
                            <select id="egg-category" name="category" class="form-control egg-library-select">
                                <option value="">All categories</option>
                                @foreach($categories as $value)
                                    <option value="{{ $value }}" {{ $category === $value ? 'selected' : '' }}>{{ ucfirst(str_replace('_', ' ', $value)) }}</option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                </div>
                <div class="egg-library-actions">
                    <button type="submit" class="btn btn-primary"><i class="fa fa-search" aria-hidden="true"></i> Search</button>
                    <a class="btn btn-default" href="{{ route('admin.egg-library.index') }}">Reset filters</a>
                </div>
            </form>
        </div>
    </div>
    @if($error)
        <div class="alert alert-warning" role="alert">{{ $error }} <a href="{{ request()->fullUrl() }}">Try again</a></div>
    @elseif($eggs->isEmpty())
        <div class="box"><div class="box-body egg-library-empty">
            <h3>No matching eggs</h3>
            <p class="text-muted">Try a different search, category, or source.</p>
        </div></div>
    @else
        <p class="text-muted">Showing {{ $eggs->firstItem() }}–{{ $eggs->lastItem() }} of {{ $eggs->total() }} eggs.</p>
        <div class="egg-library-grid">
            @foreach($eggs as $entry)
                <article class="box egg-library-card">
                    <div class="box-body">
                        <span class="label label-default">{{ ucfirst($entry['source']) }}</span>
                        <h3>{{ $entry['name'] }}</h3>
                        <p class="text-muted">{{ ucfirst(str_replace('_', ' ', $entry['category'])) }} · {{ $entry['repo'] }}</p>
                    </div>
                    <div class="box-footer">
                        <a class="btn btn-primary btn-block" href="{{ route('admin.egg-library.show', ['slug' => $entry['slug']]) }}">Preview &amp; import</a>
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
