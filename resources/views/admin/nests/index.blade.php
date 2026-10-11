@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.nests') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.nests') }}<small>{{ __('admin/ui.all_nests_currently_available_on_this_system') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/ui.nests') }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="alert alert-danger">
            {{ __('admin/ui.eggs_are_a_powerful_feature_of_aquadactyl_panel_that_allow_for_extreme_flexibility_an') }} <code>support@pterodactyl.io</code> {{ __('admin/ui.unless_you_are_absolutely_sure_of_what_you_are_doing') }}
        </div>
    </div>
</div>
<div class="row">
    <div class="col-xs-12">
        <div class="box">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.configured_nests') }}</h3>
                <div class="box-tools">
                    <a href="#" class="btn btn-sm btn-success" data-toggle="modal" data-target="#importServiceOptionModal" role="button"><i class="fa fa-upload"></i> {{ __('admin/ui.import_egg_1ba745') }}</a>
                    <a href="{{ route('admin.nests.new') }}" class="btn btn-primary btn-sm">{{ __('admin/ui.create_new') }}</a>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tr>
                        <th>ID</th>
                        <th>{{ __('admin/ui.name') }}</th>
                        <th>{{ __('admin/ui.description') }}</th>
                        <th class="text-center">{{ __('admin/ui.eggs') }}</th>
                        <th class="text-center">{{ __('admin/ui.servers') }}</th>
                    </tr>
                    @foreach($nests as $nest)
                        <tr>
                            <td class="middle"><code>{{ $nest->id }}</code></td>
                            <td class="middle"><a href="{{ route('admin.nests.view', $nest->id) }}" data-toggle="tooltip" data-placement="right" title="{{ $nest->author }}">{{ $nest->name }}</a></td>
                            <td class="col-xs-6 middle">{{ $nest->description }}</td>
                            <td class="text-center middle">{{ $nest->eggs_count }}</td>
                            <td class="text-center middle">{{ $nest->servers_count }}</td>
                        </tr>
                    @endforeach
                </table>
            </div>
        </div>
    </div>
</div>
<div class="modal fade" tabindex="-1" role="dialog" id="importServiceOptionModal">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="{{ __('admin/ui.close') }}"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">{{ __('admin/ui.import_an_egg') }}</h4>
            </div>
            <form action="{{ route('admin.nests.egg.import') }}" enctype="multipart/form-data" method="POST">
                <div class="modal-body">
                    <div class="form-group">
                        <label class="control-label" for="pImportFile">{{ __('admin/ui.egg_file') }} <span class="field-required" data-label="{{ __('admin/ui.required') }}"></span></label>
                        <div>
                            <input id="pImportFile" type="file" name="import_file" class="form-control" accept="application/json" />
                            <p class="small text-muted">{!! __('admin/ui.select_the_json_file_for_the_new_egg_that_you_wish_to_import') !!}</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="control-label" for="pImportToNest">{{ __('admin/ui.associated_nest') }} <span class="field-required" data-label="{{ __('admin/ui.required') }}"></span></label>
                        <div>
                            <select id="pImportToNest" name="import_to_nest">
                                @foreach($nests as $nest)
                                   <option value="{{ $nest->id }}">{{ $nest->name }} &lt;{{ $nest->author }}&gt;</option>
                                @endforeach
                            </select>
                            <p class="small text-muted">{{ __('admin/ui.select_the_nest_that_this_egg_will_be_associated_with_from_the_dropdown_if_you_wish_t') }}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    {{ csrf_field() }}
                    <button type="button" class="btn btn-default" data-dismiss="modal">{{ __('admin/ui.cancel') }}</button>
                    <button type="submit" class="btn btn-primary">{{ __('admin/ui.import') }}</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
        $(document).ready(function() {
            $('#pImportToNest').select2();
        });
    </script>
@endsection
