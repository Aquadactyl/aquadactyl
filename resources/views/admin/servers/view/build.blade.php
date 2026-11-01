@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.server_acb823') }} {{ $server->name }}{{ __('admin/ui.build_details') }}
@endsection

@section('content-header')
    <h1>{{ $server->name }}<small>{{ __('admin/ui.control_allocations_and_system_resources_for_this_server') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.servers') }}">{{ __('admin/ui.servers') }}</a></li>
        <li><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></li>
        <li class="active">{{ __('admin/ui.build_configuration') }}</li>
    </ol>
@endsection

@section('content')
@include('admin.servers.partials.navigation')
<div class="row">
    <form action="{{ route('admin.servers.view.build', $server->id) }}" method="POST">
        <div class="col-sm-5">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.resource_management') }}</h3>
                </div>
                <div class="box-body">
                <div class="form-group">
                        <label for="cpu" class="control-label">{{ __('admin/ui.cpu_limit') }}</label>
                        <div class="input-group">
                            <input type="text" name="cpu" class="form-control" value="{{ old('cpu', $server->cpu) }}"/>
                            <span class="input-group-addon">%</span>
                        </div>
                        <p class="text-muted small">{!! __('admin/ui.each_virtual_core_thread_on_the_system_is_considered_to_be_100_setting_this_value_to') !!}</p>
                    </div>
                    <div class="form-group">
                        <label for="threads" class="control-label">{{ __('admin/ui.cpu_pinning') }}</label>
                        <div>
                            <input type="text" name="threads" class="form-control" value="{{ old('threads', $server->threads) }}"/>
                        </div>
                        <p class="text-muted small">{!! __('admin/ui.advanced_enter_the_specific_cpu_cores_that_this_process_can_run_on_or_leave_blank_to') !!}</p>
                    </div>
                    <div class="form-group">
                        <label for="memory" class="control-label">{{ __('admin/ui.allocated_memory') }}</label>
                        <div class="input-group">
                            <input type="text" name="memory" data-multiplicator="true" class="form-control" value="{{ old('memory', $server->memory) }}"/>
                            <span class="input-group-addon">MiB</span>
                        </div>
                        <p class="text-muted small">{!! __('admin/ui.the_maximum_amount_of_memory_allowed_for_this_container_setting_this_to_0_will_allow') !!}</p>
                    </div>
                    <div class="form-group">
                        <label for="swap" class="control-label">{{ __('admin/ui.allocated_swap') }}</label>
                        <div class="input-group">
                            <input type="text" name="swap" data-multiplicator="true" class="form-control" value="{{ old('swap', $server->swap) }}"/>
                            <span class="input-group-addon">MiB</span>
                        </div>
                        <p class="text-muted small">{!! __('admin/ui.setting_this_to_0_will_disable_swap_space_on_this_server_setting_to_1_will_allow_unli') !!}</p>
                    </div>
                    <div class="form-group">
                        <label for="cpu" class="control-label">{{ __('admin/ui.disk_space_limit') }}</label>
                        <div class="input-group">
                            <input type="text" name="disk" class="form-control" value="{{ old('disk', $server->disk) }}"/>
                            <span class="input-group-addon">MiB</span>
                        </div>
                        <p class="text-muted small">{!! __('admin/ui.this_server_will_not_be_allowed_to_boot_if_it_is_using_more_than_this_amount_of_space') !!}</p>
                    </div>
                    <div class="form-group">
                        <label for="io" class="control-label">{{ __('admin/ui.block_io_proportion') }}</label>
                        <div>
                            <input type="text" name="io" class="form-control" value="{{ old('io', $server->io) }}"/>
                        </div>
                        <p class="text-muted small">{!! __('admin/ui.advanced_the_io_performance_of_this_server_relative_to_other_running_containers_on_th_bcae12') !!}</p>
                    </div>
                    <div class="form-group">
                        <label for="cpu" class="control-label">{{ __('admin/ui.oom_killer') }}</label>
                        <div>
                            <div class="radio radio-danger radio-inline">
                                <input type="radio" id="pOomKillerEnabled" value="0" name="oom_disabled" @if(!$server->oom_disabled)checked @endif>
                                <label for="pOomKillerEnabled">{{ __('admin/ui.enabled') }}</label>
                            </div>
                            <div class="radio radio-success radio-inline">
                                <input type="radio" id="pOomKillerDisabled" value="1" name="oom_disabled" @if($server->oom_disabled)checked @endif>
                                <label for="pOomKillerDisabled">{{ __('admin/ui.disabled') }}</label>
                            </div>
                            <p class="text-muted small">
                                {{ __('admin/ui.enabling_oom_killer_may_cause_server_processes_to_exit_unexpectedly') }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-sm-7">
            <div class="row">
                <div class="col-xs-12">
                    <div class="box">
                        <div class="box-header with-border">
                            <h3 class="box-title">{{ __('admin/ui.application_feature_limits') }}</h3>
                        </div>
                        <div class="box-body">
                            <div class="row">
                                <div class="form-group col-xs-6">
                                    <label for="database_limit" class="control-label">{{ __('admin/ui.database_limit') }}</label>
                                    <div>
                                        <input type="text" name="database_limit" class="form-control" value="{{ old('database_limit', $server->database_limit) }}"/>
                                    </div>
                                    <p class="text-muted small">{{ __('admin/ui.the_total_number_of_databases_a_user_is_allowed_to_create_for_this_server') }}</p>
                                </div>
                                <div class="form-group col-xs-6">
                                    <label for="allocation_limit" class="control-label">{{ __('admin/ui.allocation_limit') }}</label>
                                    <div>
                                        <input type="text" name="allocation_limit" class="form-control" value="{{ old('allocation_limit', $server->allocation_limit) }}"/>
                                    </div>
                                    <p class="text-muted small">{{ __('admin/ui.the_total_number_of_allocations_a_user_is_allowed_to_create_for_this_server') }}</p>
                                </div>
                                <div class="form-group col-xs-6">
                                    <label for="backup_limit" class="control-label">{{ __('admin/ui.backup_limit') }}</label>
                                    <div>
                                        <input type="text" name="backup_limit" class="form-control" value="{{ old('backup_limit', $server->backup_limit) }}"/>
                                    </div>
                                    <p class="text-muted small">{{ __('admin/ui.the_total_number_of_backups_that_can_be_created_for_this_server') }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xs-12">
                    <div class="box">
                        <div class="box-header with-border">
                            <h3 class="box-title">{{ __('admin/ui.allocation_management') }}</h3>
                        </div>
                        <div class="box-body">
                            <div class="form-group">
                                <label for="pAllocation" class="control-label">{{ __('admin/ui.game_port') }}</label>
                                <select data-sensitive id="pAllocation" name="allocation_id" class="form-control">
                                    @foreach ($assigned as $assignment)
                                        <option value="{{ $assignment->id }}"
                                            @if($assignment->id === $server->allocation_id)
                                                selected="selected"
                                            @endif
                                        >{{ $assignment->alias }}:{{ $assignment->port }}</option>
                                    @endforeach
                                </select>
                                <p class="text-muted small">{{ __('admin/ui.the_default_connection_address_that_will_be_used_for_this_game_server') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pAddAllocations" class="control-label">{{ __('admin/ui.assign_additional_ports') }}</label>
                                <div>
                                    <select data-sensitive name="add_allocations[]" class="form-control" multiple id="pAddAllocations">
                                        @foreach ($unassigned as $assignment)
                                            <option value="{{ $assignment->id }}">{{ $assignment->alias }}:{{ $assignment->port }}</option>
                                        @endforeach
                                    </select>
                                </div>
                                <p class="text-muted small">{{ __('admin/ui.please_note_that_due_to_software_limitations_you_cannot_assign_identical_ports_on_dif') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pRemoveAllocations" class="control-label">{{ __('admin/ui.remove_additional_ports') }}</label>
                                <div>
                                    <select data-sensitive name="remove_allocations[]" class="form-control" multiple id="pRemoveAllocations">
                                        @foreach ($assigned as $assignment)
                                            <option value="{{ $assignment->id }}">{{ $assignment->alias }}:{{ $assignment->port }}</option>
                                        @endforeach
                                    </select>
                                </div>
                                <p class="text-muted small">{{ __('admin/ui.simply_select_which_ports_you_would_like_to_remove_from_the_list_above_if_you_want_to') }}</p>
                            </div>
                        </div>
                        <div class="box-footer">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-primary pull-right">{{ __('admin/ui.update_build_configuration') }}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    $('#pAddAllocations').select2();
    $('#pRemoveAllocations').select2();
    $('#pAllocation').select2();
    </script>
@endsection
