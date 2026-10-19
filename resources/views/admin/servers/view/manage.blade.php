@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.server_acb823') }} {{ $server->name }}{{ __('admin/ui.manage_fdc35f') }}
@endsection

@section('content-header')
    <h1>{{ $server->name }}<small>{{ __('admin/ui.additional_actions_to_control_this_server') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.servers') }}">{{ __('admin/ui.servers') }}</a></li>
        <li><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></li>
        <li class="active">{{ __('admin/ui.manage') }}</li>
    </ol>
@endsection

@section('content')
    @include('admin.servers.partials.navigation')
    <div class="row equal-height">
        <div class="col-sm-4">
            <div class="box box-danger">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.reinstall_server') }}</h3>
                </div>
                <div class="box-body">
                    <p>{!! __('admin/ui.this_will_reinstall_the_server_with_the_assigned_service_scripts_danger_this_could_ov') !!}</p>
                </div>
                <div class="box-footer">
                    @if(! $server->canBeReinstalled())
                        <button class="btn btn-danger disabled">{{ __('admin/ui.reinstall_server') }}</button>
                        <p style="padding-top: 1rem;">{{ __('admin/ui.this_server_is_set_to_skip_its_install_script_disable_skip_egg_install_script_on_the') }}</p>
                    @elseif($server->isInstalled())
                        <form action="{{ route('admin.servers.view.manage.reinstall', $server->id) }}" method="POST">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-danger">{{ __('admin/ui.reinstall_server') }}</button>
                        </form>
                    @else
                        <button class="btn btn-danger disabled">{{ __('admin/ui.server_must_install_properly_to_reinstall') }}</button>
                    @endif
                </div>
            </div>
        </div>
        <div class="col-sm-4">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.install_status') }}</h3>
                </div>
                <div class="box-body">
                    <p>{{ __('admin/ui.if_you_need_to_change_the_install_status_from_uninstalled_to_installed_or_vice_versa') }}</p>
                </div>
                <div class="box-footer">
                    <form action="{{ route('admin.servers.view.manage.toggle', $server->id) }}" method="POST">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-primary">{{ __('admin/ui.toggle_install_status') }}</button>
                    </form>
                </div>
            </div>
        </div>

        @if($server->account_suspended)
            <div class="col-sm-4"><div class="box box-warning"><div class="box-header with-border"><h3 class="box-title">{{ __('admin/management.account_suspended') }}</h3></div><div class="box-body"><p>{{ __('admin/management.restore_account_first') }}</p><a class="btn btn-default" href="{{ route('admin.users.view', $server->owner_id, false) }}#account-suspension">{{ __('admin/management.manage_owner') }}</a></div></div></div>
        @elseif(! $server->isSuspended())
            <div class="col-sm-4">
                <div class="box box-warning">
                    <div class="box-header with-border">
                        <h3 class="box-title">{{ __('admin/ui.suspend_server') }}</h3>
                    </div>
                    <div class="box-body">
                        <p>{{ __('admin/ui.this_will_suspend_the_server_stop_any_running_processes_and_immediately_block_the_use') }}</p>
                    </div>
                    <div class="box-footer">
                        <form action="{{ route('admin.servers.view.manage.suspension', $server->id) }}" method="POST">
                            {!! csrf_field() !!}
                            <input type="hidden" name="action" value="suspend" />
                            <button type="submit" class="btn btn-warning @if(! is_null($server->transfer)) disabled @endif">{{ __('admin/ui.suspend_server') }}</button>
                        </form>
                    </div>
                </div>
            </div>
        @else
            <div class="col-sm-4">
                <div class="box box-success">
                    <div class="box-header with-border">
                        <h3 class="box-title">{{ __('admin/ui.unsuspend_server') }}</h3>
                    </div>
                    <div class="box-body">
                        <p>{{ __('admin/ui.this_will_unsuspend_the_server_and_restore_normal_user_access') }}</p>
                    </div>
                    <div class="box-footer">
                        <form action="{{ route('admin.servers.view.manage.suspension', $server->id) }}" method="POST">
                            {!! csrf_field() !!}
                            <input type="hidden" name="action" value="unsuspend" />
                            <button type="submit" class="btn btn-success">{{ __('admin/ui.unsuspend_server') }}</button>
                        </form>
                    </div>
                </div>
            </div>
        @endif

        @if(is_null($server->transfer))
            <div class="col-sm-4">
                <div class="box box-success">
                    <div class="box-header with-border">
                        <h3 class="box-title">{{ __('admin/ui.transfer_server') }}</h3>
                    </div>
                    <div class="box-body">
                        <p>{!! __('admin/ui.transfer_this_server_to_another_node_connected_to_this_panel_warning_this_feature_has') !!}</p>
                    </div>

                    <div class="box-footer">
                        @if($canTransfer)
                            <button class="btn btn-success" data-toggle="modal" data-target="#transferServerModal">{{ __('admin/ui.transfer_server') }}</button>
                        @else
                            <button class="btn btn-success disabled">{{ __('admin/ui.transfer_server') }}</button>
                            <p style="padding-top: 1rem;">{{ __('admin/ui.transferring_a_server_requires_more_than_one_node_to_be_configured_on_your_panel') }}</p>
                        @endif
                    </div>
                </div>
            </div>
        @else
            <div class="col-sm-4">
                <div class="box box-success">
                    <div class="box-header with-border">
                        <h3 class="box-title">{{ __('admin/ui.transfer_server') }}</h3>
                    </div>
                    <div class="box-body">
                        <p>
                            {{ __('admin/ui.this_server_is_currently_being_transferred_to_another_node_transfer_was_initiated_at') }} <strong>{{ $server->transfer->created_at }}</strong>
                        </p>
                    </div>

                    <div class="box-footer">
                        <button class="btn btn-success disabled">{{ __('admin/ui.transfer_server') }}</button>
                    </div>
                </div>
            </div>
        @endif
    </div>

    <div class="modal fade" id="transferServerModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <form action="{{ route('admin.servers.view.manage.transfer', $server->id) }}" method="POST">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="{{ __('admin/ui.close') }}"><span aria-hidden="true">&times;</span></button>
                        <h4 class="modal-title">{{ __('admin/ui.transfer_server') }}</h4>
                    </div>

                    <div class="modal-body">
                        <div class="row">
                            <div class="form-group col-md-12">
                                <label for="pNodeId">{{ __('admin/ui.node') }}</label>
                                <select name="node_id" id="pNodeId" class="form-control">
                                    @foreach($locations as $location)
                                        <optgroup label="{{ $location->long }} ({{ $location->short }})">
                                            @foreach($location->nodes as $node)

                                                @if($node->id != $server->node_id)
                                                    <option value="{{ $node->id }}"
                                                            @if($location->id === old('location_id')) selected @endif
                                                    >{{ $node->name }}</option>
                                                @endif

                                            @endforeach
                                        </optgroup>
                                    @endforeach
                                </select>
                                <p class="small text-muted no-margin">{{ __('admin/ui.the_node_which_this_server_will_be_transferred_to') }}</p>
                            </div>

                            <div class="form-group col-md-12">
                                <label for="pAllocation">{{ __('admin/ui.default_allocation') }}</label>
                                <select name="allocation_id" id="pAllocation" class="form-control"></select>
                                <p class="small text-muted no-margin">{{ __('admin/ui.the_main_allocation_that_will_be_assigned_to_this_server') }}</p>
                            </div>

                            <div class="form-group col-md-12">
                                <label for="pAllocationAdditional">{{ __('admin/ui.additional_allocation_s') }}</label>
                                <select name="allocation_additional[]" id="pAllocationAdditional" class="form-control" multiple></select>
                                <p class="small text-muted no-margin">{{ __('admin/ui.additional_allocations_to_assign_to_this_server_on_creation') }}</p>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        {!! csrf_field() !!}
                        <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">{{ __('admin/ui.cancel') }}</button>
                        <button type="submit" class="btn btn-success btn-sm">{{ __('admin/ui.confirm') }}</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection

@section('footer-scripts')
    @parent
    {!! Theme::js('vendor/lodash/lodash.js') !!}

    @if($canTransfer)
        {!! Theme::js('js/admin/server/transfer.js') !!}
    @endif
@endsection
