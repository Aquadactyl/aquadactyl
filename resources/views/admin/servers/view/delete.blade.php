@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.server_acb823') }} {{ $server->name }}{{ __('admin/ui.delete_d48c70') }}
@endsection

@section('content-header')
    <h1>{{ $server->name }}<small>{{ __('admin/ui.delete_this_server_from_the_panel') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.servers') }}">{{ __('admin/ui.servers') }}</a></li>
        <li><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></li>
        <li class="active">{{ __('admin/ui.delete') }}</li>
    </ol>
@endsection

@section('content')
@include('admin.servers.partials.navigation')
<div class="row">
    <div class="col-md-6">
        <div class="box">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.safely_delete_server') }}</h3>
            </div>
            <div class="box-body">
                <p>{{ __('admin/ui.this_action_will_attempt_to_delete_the_server_from_both_the_panel_and_daemon_if_eithe') }}</p>
                <p class="text-danger small">{!! __('admin/ui.deleting_a_server_is_an_irreversible_action_all_server_data_including_files_and_users') !!}</p>
            </div>
            <div class="box-footer">
                <form id="deleteform" action="{{ route('admin.servers.view.delete', $server->id) }}" method="POST">
                    {!! csrf_field() !!}
                    <button id="deletebtn" class="btn btn-danger">{{ __('admin/ui.safely_delete_this_server') }}</button>
                </form>
            </div>
        </div>
    </div>
    <div class="col-md-6">
        <div class="box box-danger">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.force_delete_server') }}</h3>
            </div>
            <div class="box-body">
                <p>{{ __('admin/ui.this_action_will_attempt_to_delete_the_server_from_both_the_panel_and_daemon_if_the_d') }}</p>
                <p class="text-danger small">{!! __('admin/ui.deleting_a_server_is_an_irreversible_action_all_server_data_including_files_and_users_b8b2fa') !!}</p>
            </div>
            <div class="box-footer">
                <form id="forcedeleteform" action="{{ route('admin.servers.view.delete', $server->id) }}" method="POST">
                    {!! csrf_field() !!}
                    <input type="hidden" name="force_delete" value="1" />
                    <button id="forcedeletebtn"" class="btn btn-danger">{{ __('admin/ui.forcibly_delete_this_server') }}</button>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    $('#deletebtn').click(function (event) {
        event.preventDefault();
        swal({
            title: '',
            type: 'warning',
            text: @json(__('admin/ui.are_you_sure_that_you_want_to_delete_this_server_there_is_no_going_back_all_data_will')),
            showCancelButton: true,
            confirmButtonText: @json(__('admin/ui.delete')),
            confirmButtonColor: '#d9534f',
            closeOnConfirm: false
        }, function () {
            $('#deleteform').submit()
        });
    });

    $('#forcedeletebtn').click(function (event) {
        event.preventDefault();
        swal({
            title: '',
            type: 'warning',
            text: @json(__('admin/ui.are_you_sure_that_you_want_to_delete_this_server_there_is_no_going_back_all_data_will')),
            showCancelButton: true,
            confirmButtonText: @json(__('admin/ui.delete')),
            confirmButtonColor: '#d9534f',
            closeOnConfirm: false
        }, function () {
            $('#forcedeleteform').submit()
        });
    });
    </script>
@endsection
