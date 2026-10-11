@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.server_acb823') }} {{ $server->name }}{{ __('admin/ui.databases_b5b9ff') }}
@endsection

@section('content-header')
    <h1>{{ $server->name }}<small>{{ __('admin/ui.manage_server_databases') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.servers') }}">{{ __('admin/ui.servers') }}</a></li>
        <li><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></li>
        <li class="active">{{ __('admin/ui.databases') }}</li>
    </ol>
@endsection

@section('content')
@include('admin.servers.partials.navigation')
<div class="row">
    <div class="col-sm-7">
        <div class="alert alert-info">
            {{ __('admin/ui.database_passwords_can_be_viewed_when') }} <a href="/server/{{ $server->identifier }}/databases">{{ __('admin/ui.visiting_this_server') }}</a> {{ __('admin/ui.on_the_front_end') }}
        </div>
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.active_databases') }}</h3>
            </div>
            <div class="box-body table-responsible no-padding">
                <table class="table table-hover">
                    <tr>
                        <th>{{ __('admin/ui.database') }}</th>
                        <th>{{ __('admin/ui.username') }}</th>
                        <th>{{ __('admin/ui.connections_from') }}</th>
                        <th>{{ __('admin/ui.host') }}</th>
                        <th>{{ __('admin/ui.max_connections') }}</th>
                        <th></th>
                    </tr>
                    @foreach($server->databases as $database)
                        <tr>
                            <td>{{ $database->database }}</td>
                            <td>{{ $database->username }}</td>
                            <td>{{ $database->remote }}</td>
                            <td><code data-sensitive tabindex="0">{{ $database->host->host }}:{{ $database->host->port }}</code></td>
                            @if($database->max_connections != null)
                                <td>{{ $database->max_connections }}</td>
                            @else
                                <td>{{ __('admin/ui.unlimited') }}</td>
                            @endif
                            <td class="text-center">
                                <button data-action="reset-password" data-id="{{ $database->id }}" class="btn btn-xs btn-primary"><i class="fa fa-refresh"></i></button>
                                <button data-action="remove" data-id="{{ $database->id }}" class="btn btn-xs btn-danger"><i class="fa fa-trash"></i></button>
                            </td>
                        </tr>
                    @endforeach
                </table>
            </div>
        </div>
    </div>
    <div class="col-sm-5">
        <div class="box box-success">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.create_new_database') }}</h3>
            </div>
            <form action="{{ route('admin.servers.view.database', $server->id) }}" method="POST">
                <div class="box-body">
                    <div class="form-group">
                        <label for="pDatabaseHostId" class="control-label">{{ __('admin/ui.database_host') }}</label>
                        <select id="pDatabaseHostId" name="database_host_id" class="form-control">
                            @foreach($hosts as $host)
                                <option value="{{ $host->id }}">{{ $host->name }}</option>
                            @endforeach
                        </select>
                        <p class="text-muted small">{{ __('admin/ui.select_the_host_database_server_that_this_database_should_be_created_on') }}</p>
                    </div>
                    <div class="form-group">
                        <label for="pDatabaseName" class="control-label">{{ __('admin/ui.database') }}</label>
                        <div class="input-group">
                            <span class="input-group-addon">s{{ $server->id }}_</span>
                            <input id="pDatabaseName" type="text" name="database" class="form-control" placeholder="database" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="pRemote" class="control-label">{{ __('admin/ui.connections') }}</label>
                        <input id="pRemote" type="text" data-sensitive name="remote" class="form-control" value="%" />
                        <p class="text-muted small">{!! __('admin/ui.this_should_reflect_the_ip_address_that_connections_are_allowed_from_uses_standard_my') !!}</p>
                    </div>
                    <div class="form-group">
                        <label for="pmax_connections" class="control-label">{{ __('admin/ui.concurrent_connections') }}</label>
                        <input id="pmax_connections" type="text" name="max_connections" class="form-control"/>
                        <p class="text-muted small">{{ __('admin/ui.this_should_reflect_the_max_number_of_concurrent_connections_from_this_user_to_the_da') }}</p>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <p class="text-muted small no-margin">{{ __('admin/ui.a_username_and_password_for_this_database_will_be_randomly_generated_after_form_submi') }}</p>
                    <input type="submit" class="btn btn-sm btn-success pull-right" value="Create Database" />
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    $('#pDatabaseHost').select2();
    $('[data-action="remove"]').click(function (event) {
        event.preventDefault();
        var self = $(this);
        swal({
            title: '',
            type: 'warning',
            text: @json(__('admin/ui.are_you_sure_that_you_want_to_delete_this_database_there_is_no_going_back_all_data_wi')),
            showCancelButton: true,
            confirmButtonText: @json(__('admin/ui.delete')),
            confirmButtonColor: '#d9534f',
            closeOnConfirm: false,
            showLoaderOnConfirm: true,
        }, function () {
            $.ajax({
                method: 'DELETE',
                url: '/admin/servers/view/{{ $server->id }}/database/' + self.data('id') + '/delete',
                headers: { 'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content') },
            }).done(function () {
                self.parent().parent().slideUp();
                swal.close();
            }).fail(function (jqXHR) {
                console.error(jqXHR);
                swal({
                    type: 'error',
                    title: @json(__('admin/ui.whoops')),
                    text: (typeof jqXHR.responseJSON.error !== 'undefined') ? jqXHR.responseJSON.error : 'An error occurred while processing this request.'
                });
            });
        });
    });
    $('[data-action="reset-password"]').click(function (e) {
        e.preventDefault();
        var block = $(this);
        $(this).addClass('disabled').find('i').addClass('fa-spin');
        $.ajax({
            type: 'PATCH',
            url: '/admin/servers/view/{{ $server->id }}/database',
            headers: { 'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content') },
            data: { database: $(this).data('id') },
        }).done(function (data) {
            swal({
                type: 'success',
                title: '',
                text: @json(__('admin/ui.the_password_for_this_database_has_been_reset')),
            });
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error(jqXHR);
            var error = 'An error occurred while trying to process this request.';
            if (typeof jqXHR.responseJSON !== 'undefined' && typeof jqXHR.responseJSON.error !== 'undefined') {
                error = jqXHR.responseJSON.error;
            }
            swal({
                type: 'error',
                title: @json(__('admin/ui.whoops')),
                text: error
            });
        }).always(function () {
            block.removeClass('disabled').find('i').removeClass('fa-spin');
        });
    });
    </script>
@endsection
