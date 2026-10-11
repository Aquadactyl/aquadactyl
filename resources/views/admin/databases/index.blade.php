@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.database_hosts') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.database_hosts') }}<small>{{ __('admin/ui.database_hosts_that_servers_can_have_databases_created_on') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/ui.database_hosts') }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.host_list') }}</h3>
                <div class="box-tools">
                    <button class="btn btn-sm btn-primary" data-toggle="modal" data-target="#newHostModal">{{ __('admin/ui.create_new') }}</button>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th>ID</th>
                            <th>{{ __('admin/ui.name') }}</th>
                            <th>{{ __('admin/ui.host') }}</th>
                            <th>{{ __('admin/ui.port') }}</th>
                            <th>{{ __('admin/ui.username') }}</th>
                            <th class="text-center">{{ __('admin/ui.databases') }}</th>
                            <th class="text-center">{{ __('admin/ui.node') }}</th>
                        </tr>
                        @foreach ($hosts as $host)
                            <tr>
                                <td><code>{{ $host->id }}</code></td>
                                <td><a href="{{ route('admin.databases.view', $host->id) }}">{{ $host->name }}</a></td>
                                <td><code data-sensitive tabindex="0">{{ $host->host }}</code></td>
                                <td><code>{{ $host->port }}</code></td>
                                <td>{{ $host->username }}</td>
                                <td class="text-center">{{ $host->databases_count }}</td>
                                <td class="text-center">
                                    @if(! is_null($host->node))
                                        <a href="{{ route('admin.nodes.view', $host->node->id) }}">{{ $host->node->name }}</a>
                                    @else
                                        <span class="label label-default">{{ __('admin/ui.none') }}</span>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
<div class="modal fade" id="newHostModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <form action="{{ route('admin.databases') }}" method="POST">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="{{ __('admin/ui.close') }}"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">{{ __('admin/ui.create_new_database_host') }}</h4>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="pName" class="form-label">{{ __('admin/ui.name') }}</label>
                        <input type="text" name="name" id="pName" class="form-control" />
                        <p class="text-muted small">{!! __('admin/ui.a_short_identifier_used_to_distinguish_this_location_from_others_must_be_between_1_an') !!}</p>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <label for="pHost" class="form-label">{{ __('admin/ui.host') }}</label>
                            <input type="text" name="host" id="pHost" class="form-control" />
                            <p class="text-muted small">{!! __('admin/ui.the_ip_address_or_fqdn_that_should_be_used_when_attempting_to_connect_to_this_mysql_h') !!}</p>
                        </div>
                        <div class="col-md-6">
                            <label for="pPort" class="form-label">{{ __('admin/ui.port') }}</label>
                            <input type="text" name="port" id="pPort" class="form-control" value="3306"/>
                            <p class="text-muted small">{{ __('admin/ui.the_port_that_mysql_is_running_on_for_this_host') }}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <label for="pUsername" class="form-label">{{ __('admin/ui.username') }}</label>
                            <input data-sensitive type="text" name="username" id="pUsername" class="form-control" />
                            <p class="text-muted small">{{ __('admin/ui.the_username_of_an_account_that_has_enough_permissions_to_create_new_users_and_databa') }}</p>
                        </div>
                        <div class="col-md-6">
                            <label for="pPassword" class="form-label">{{ __('admin/ui.password') }}</label>
                            <input type="password" name="password" id="pPassword" class="form-control" />
                            <p class="text-muted small">{{ __('admin/ui.the_password_to_the_account_defined') }}</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="pNodeId" class="form-label">{{ __('admin/ui.linked_node') }}</label>
                        <select name="node_id" id="pNodeId" class="form-control">
                            <option value="">{{ __('admin/ui.none') }}</option>
                            @foreach($locations as $location)
                                <optgroup label="{{ $location->short }}">
                                    @foreach($location->nodes as $node)
                                        <option value="{{ $node->id }}">{{ $node->name }}</option>
                                    @endforeach
                                </optgroup>
                            @endforeach
                        </select>
                        <p class="text-muted small">{{ __('admin/ui.this_setting_does_nothing_other_than_default_to_this_database_host_when_adding_a_data') }}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <p class="text-danger small text-left">{!! __('admin/ui.the_account_defined_for_this_database_host_must_have_the_with_grant_option_permission') !!}</p>
                    {!! csrf_field() !!}
                    <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">{{ __('admin/ui.cancel') }}</button>
                    <button type="submit" class="btn btn-success btn-sm">{{ __('admin/ui.create') }}</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
        $('#pNodeId').select2();
    </script>
@endsection
