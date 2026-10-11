@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.nests_d724db') }} {{ $nest->name }}
@endsection

@section('content-header')
    <h1>{{ $nest->name }}<small>{{ str_limit($nest->description, 50) }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.nests') }}">{{ __('admin/ui.nests') }}</a></li>
        <li class="active">{{ $nest->name }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <form action="{{ route('admin.nests.view', $nest->id) }}" method="POST">
        <div class="col-md-6">
            <div class="box">
                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">{{ __('admin/ui.name') }} <span class="field-required" data-label="{{ __('admin/ui.required') }}"></span></label>
                        <div>
                            <input type="text" name="name" class="form-control" value="{{ $nest->name }}" />
                            <p class="text-muted"><small>{{ __('admin/ui.this_should_be_a_descriptive_category_name_that_encompasses_all_of_the_options_within') }}</small></p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="control-label">{{ __('admin/ui.description') }}</label>
                        <div>
                            <textarea name="description" class="form-control" rows="7">{{ $nest->description }}</textarea>
                        </div>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" name="_method" value="PATCH" class="btn btn-primary btn-sm pull-right">{{ __('admin/ui.save') }}</button>
                    <button id="deleteButton" type="submit" name="_method" value="DELETE" class="btn btn-sm btn-danger muted muted-hover"><i class="fa fa-trash-o"></i></button>
                </div>
            </div>
        </div>
    </form>
    <div class="col-md-6">
        <div class="box">
            <div class="box-body">
                <div class="form-group">
                    <label class="control-label">{{ __('admin/ui.nest_id') }}</label>
                    <div>
                        <input type="text" readonly class="form-control" value="{{ $nest->id }}" />
                        <p class="text-muted small">{{ __('admin/ui.a_unique_id_used_for_identification_of_this_nest_internally_and_through_the_api') }}</p>
                    </div>
                </div>
                <div class="form-group">
                    <label class="control-label">{{ __('admin/ui.author_d95082') }}</label>
                    <div>
                        <input type="text" readonly class="form-control" value="{{ $nest->author }}" />
                        <p class="text-muted small">{{ __('admin/ui.the_author_of_this_service_option_please_direct_questions_and_issues_to_them_unless_t') }} <code>support@pterodactyl.io</code>.</p>
                    </div>
                </div>
                <div class="form-group">
                    <label class="control-label">{{ __('admin/ui.uuid') }}</label>
                    <div>
                        <input type="text" readonly class="form-control" value="{{ $nest->uuid }}" />
                        <p class="text-muted small">{{ __('admin/ui.a_uuid_that_all_servers_using_this_option_are_assigned_for_identification_purposes') }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.nest_eggs') }}</h3>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tr>
                        <th>ID</th>
                        <th>{{ __('admin/ui.name') }}</th>
                        <th>{{ __('admin/ui.description') }}</th>
                        <th class="text-center">{{ __('admin/ui.servers') }}</th>
                        <th class="text-center"></th>
                    </tr>
                    @foreach($nest->eggs as $egg)
                        <tr>
                            <td class="align-middle"><code>{{ $egg->id }}</code></td>
                            <td class="align-middle"><a href="{{ route('admin.nests.egg.view', $egg->id) }}" data-toggle="tooltip" data-placement="right" title="{{ $egg->author }}">{{ $egg->name }}</a></td>
                            <td class="col-xs-8 align-middle">{{ $egg->description }}</td>
                            <td class="text-center align-middle"><code>{{ $egg->servers->count() }}</code></td>
                            <td class="align-middle">
                                <a href="{{ route('admin.nests.egg.export', ['egg' => $egg->id]) }}"><i class="fa fa-download"></i></a>
                            </td>
                        </tr>
                    @endforeach
                </table>
            </div>
            <div class="box-footer">
                <a href="{{ route('admin.nests.egg.new') }}"><button class="btn btn-success btn-sm pull-right">{{ __('admin/ui.new_egg') }}</button></a>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
        $('#deleteButton').on('mouseenter', function (event) {
            $(this).find('i').html(' Delete Nest');
        }).on('mouseleave', function (event) {
            $(this).find('i').html('');
        });
    </script>
@endsection
