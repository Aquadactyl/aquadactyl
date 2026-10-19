@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.new_server') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.create_server') }}<small>{{ __('admin/ui.add_a_new_server_to_the_panel') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.servers') }}">{{ __('admin/ui.servers') }}</a></li>
        <li class="active">{{ __('admin/ui.create_server') }}</li>
    </ol>
@endsection

@section('content')
<form action="{{ route('admin.servers.new') }}" method="POST" class="server-create-form">
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.core_details') }}</h3>
                </div>

                <div class="box-body row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="pName">{{ __('admin/ui.server_name') }}</label>
                            <input type="text" class="form-control" id="pName" name="name" value="{{ old('name') }}" placeholder="{{ __('admin/ui.server_name') }}">
                            <p class="small text-muted no-margin">{!! __('admin/ui.character_limits_a_z_a_z_0_9_and_space') !!}</p>
                        </div>

                        <div class="form-group">
                            <label for="pUserId">{{ __('admin/ui.server_owner') }}</label>
                            <select data-sensitive id="pUserId" name="owner_id" class="form-control" style="padding-left:0;"></select>
                            <p class="small text-muted no-margin">{{ __('admin/ui.email_address_of_the_server_owner') }}</p>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="pDescription" class="control-label">{{ __('admin/ui.server_description') }}</label>
                            <textarea id="pDescription" name="description" rows="3" class="form-control">{{ old('description') }}</textarea>
                            <p class="text-muted small">{{ __('admin/ui.a_brief_description_of_this_server') }}</p>
                        </div>

                        <div class="form-group">
                            <div class="checkbox checkbox-primary no-margin-bottom">
                                <input id="pStartOnCreation" name="start_on_completion" type="checkbox" {{ \Pterodactyl\Helpers\Utilities::checked('start_on_completion', 1) }} />
                                <label for="pStartOnCreation" class="strong">{{ __('admin/ui.start_server_when_installed') }}</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="overlay" id="allocationLoader" style="display:none;"><i class="fa fa-refresh fa-spin"></i></div>
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.allocation_management') }}</h3>
                </div>

                <div class="box-body row">
                    <div class="form-group col-sm-4">
                        <label for="pNodeId">{{ __('admin/ui.node') }}</label>
                        <button class="btn btn-link quick-create-node" type="button" data-toggle="modal" data-target="#quickSetupModal"><i class="fa fa-plus" aria-hidden="true"></i> {{ __('admin/ui.create_node') }}</button>
                        <select name="node_id" id="pNodeId" class="form-control">
                            @foreach($locations as $location)
                                <optgroup label="{{ $location->long }} ({{ $location->short }})">
                                @foreach($location->nodes as $node)

                                <option value="{{ $node->id }}"
                                    @if($location->id === old('location_id')) selected @endif
                                >{{ $node->name }}</option>

                                @endforeach
                                </optgroup>
                            @endforeach
                        </select>

                        <p class="small text-muted no-margin">{{ __('admin/ui.the_node_which_this_server_will_be_deployed_to') }}</p>
                        <p class="small text-info" id="quick-node-created" role="status" hidden>{{ __('admin/management.node_created_help') }} <a target="_blank" rel="noopener" href="#">{{ __('admin/management.configure_daemon') }}</a></p>
                    </div>

                    <div class="form-group col-sm-4">
                        <label for="pAllocation">{{ __('admin/ui.default_allocation') }}</label>
                        <select data-sensitive id="pAllocation" name="allocation_id" class="form-control"></select>
                        <p class="small text-muted no-margin">{{ __('admin/ui.the_main_allocation_that_will_be_assigned_to_this_server') }}</p>
                    </div>

                    <div class="form-group col-sm-4">
                        <label for="pAllocationAdditional">{{ __('admin/ui.additional_allocation_s') }}</label>
                        <select data-sensitive id="pAllocationAdditional" name="allocation_additional[]" class="form-control" multiple></select>
                        <p class="small text-muted no-margin">{{ __('admin/ui.additional_allocations_to_assign_to_this_server_on_creation') }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="overlay" id="allocationLoader" style="display:none;"><i class="fa fa-refresh fa-spin"></i></div>
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.application_feature_limits') }}</h3>
                </div>

                <div class="box-body row">
                    <div class="form-group col-xs-6">
                        <label for="pDatabaseLimit" class="control-label">{{ __('admin/ui.database_limit') }}</label>
                        <div>
                            <input type="text" id="pDatabaseLimit" name="database_limit" class="form-control" value="{{ old('database_limit', 0) }}"/>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.the_total_number_of_databases_a_user_is_allowed_to_create_for_this_server') }}</p>
                    </div>
                    <div class="form-group col-xs-6">
                        <label for="pAllocationLimit" class="control-label">{{ __('admin/ui.allocation_limit') }}</label>
                        <div>
                            <input type="text" id="pAllocationLimit" name="allocation_limit" class="form-control" value="{{ old('allocation_limit', 0) }}"/>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.the_total_number_of_allocations_a_user_is_allowed_to_create_for_this_server') }}</p>
                    </div>
                    <div class="form-group col-xs-6">
                        <label for="pBackupLimit" class="control-label">{{ __('admin/ui.backup_limit') }}</label>
                        <div>
                            <input type="text" id="pBackupLimit" name="backup_limit" class="form-control" value="{{ old('backup_limit', 0) }}"/>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.the_total_number_of_backups_that_can_be_created_for_this_server') }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.resource_management') }}</h3>
                </div>

                <div class="box-body row">
                    <div class="form-group col-xs-6">
                        <label for="pCPU">{{ __('admin/ui.cpu_limit') }}</label>

                        <div class="input-group">
                            <input type="text" id="pCPU" name="cpu" class="form-control" value="{{ old('cpu', 0) }}" />
                            <span class="input-group-addon">%</span>
                        </div>

                        <p class="text-muted small">{{ __('admin/ui.if_you_do_not_want_to_limit_cpu_usage_set_the_value_to') }} <code>0</code>{{ __('admin/ui.to_determine_a_value_take_the_number_of_threads_and_multiply_it_by_100_for_example_on') }} <code>(4 * 100 = 400)</code> {{ __('admin/ui.there_is') }} <code>400%</code> {{ __('admin/ui.available_to_limit_a_server_to_using_half_of_a_single_thread_you_would_set_the_value') }} <code>50</code>{{ __('admin/ui.to_allow_a_server_to_use_up_to_two_threads_set_the_value_to') }} <code>200</code>.<p>
                    </div>

                    <div class="form-group col-xs-6">
                        <label for="pThreads">{{ __('admin/ui.cpu_pinning') }}</label>

                        <div>
                            <input type="text" id="pThreads" name="threads" class="form-control" value="{{ old('threads') }}" />
                        </div>

                        <p class="text-muted small"><strong>{{ __('admin/ui.advanced') }}</strong> {{ __('admin/ui.enter_the_specific_cpu_threads_that_this_process_can_run_on_or_leave_blank_to_allow_a') }} <code>0</code>, <code>0-1,3</code>{{ __('admin/ui.or') }} <code>0,1,3,4</code>.</p>
                    </div>
                </div>

                <div class="box-body row">
                    <div class="form-group col-xs-6">
                        <label for="pMemory">{{ __('admin/ui.memory') }}</label>

                        <div class="input-group">
                            <input type="text" id="pMemory" name="memory" class="form-control" value="{{ old('memory') }}" />
                            <span class="input-group-addon">MiB</span>
                        </div>

                        <p class="text-muted small">{!! __('admin/ui.the_maximum_amount_of_memory_allowed_for_this_container_setting_this_to_0_will_allow') !!}</p>
                    </div>

                    <div class="form-group col-xs-6">
                        <label for="pSwap">{{ __('admin/ui.swap') }}</label>

                        <div class="input-group">
                            <input type="text" id="pSwap" name="swap" class="form-control" value="{{ old('swap', 0) }}" />
                            <span class="input-group-addon">MiB</span>
                        </div>

                        <p class="text-muted small">{!! __('admin/ui.setting_this_to_0_will_disable_swap_space_on_this_server_setting_to_1_will_allow_unli') !!}</p>
                    </div>
                </div>

                <div class="box-body row">
                    <div class="form-group col-xs-6">
                        <label for="pDisk">{{ __('admin/ui.disk_space') }}</label>

                        <div class="input-group">
                            <input type="text" id="pDisk" name="disk" class="form-control" value="{{ old('disk') }}" />
                            <span class="input-group-addon">MiB</span>
                        </div>

                        <p class="text-muted small">{!! __('admin/ui.this_server_will_not_be_allowed_to_boot_if_it_is_using_more_than_this_amount_of_space') !!}</p>
                    </div>

                    <div class="form-group col-xs-6">
                        <label for="pIO">{{ __('admin/ui.block_io_weight') }}</label>

                        <div>
                            <input type="text" id="pIO" name="io" class="form-control" value="{{ old('io', 500) }}" />
                        </div>

                        <p class="text-muted small">{!! __('admin/ui.advanced_the_io_performance_of_this_server_relative_to_other_running_containers_on_th') !!}</p>
                    </div>
                    <div class="form-group col-xs-12">
                        <div class="checkbox checkbox-primary no-margin-bottom">
                            <input type="checkbox" id="pOomDisabled" name="oom_disabled" value="0" {{ \Pterodactyl\Helpers\Utilities::checked('oom_disabled', 0) }} />
                            <label for="pOomDisabled" class="strong">{{ __('admin/ui.enable_oom_killer') }}</label>
                        </div>

                        <p class="small text-muted no-margin">{{ __('admin/ui.terminates_the_server_if_it_breaches_the_memory_limits_enabling_oom_killer_may_cause') }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.nest_configuration') }}</h3>
                </div>

                <div class="box-body row">
                    <div class="form-group col-xs-12">
                        <label for="pNestId">{{ __('admin/ui.nest') }}</label>

                        <select id="pNestId" name="nest_id" class="form-control">
                            @foreach($nests as $nest)
                                <option value="{{ $nest->id }}"
                                    @if($nest->id === old('nest_id'))
                                        selected="selected"
                                    @endif
                                >{{ $nest->name }}</option>
                            @endforeach
                        </select>

                        <p class="small text-muted no-margin">{{ __('admin/ui.select_the_nest_that_this_server_will_be_grouped_under') }}</p>
                    </div>

                    <div class="form-group col-xs-12">
                        <label for="pEggId">{{ __('admin/ui.egg_37c50c') }}</label>
                        <select id="pEggId" name="egg_id" class="form-control"></select>
                        <p class="small text-muted no-margin">{{ __('admin/ui.select_the_egg_that_will_define_how_this_server_should_operate') }}</p>
                    </div>
                    <div class="form-group col-xs-12">
                        <div class="checkbox checkbox-primary no-margin-bottom">
                            <input type="checkbox" id="pSkipScripting" name="skip_scripts" value="1" {{ \Pterodactyl\Helpers\Utilities::checked('skip_scripts', 0) }} />
                            <label for="pSkipScripting" class="strong">{{ __('admin/ui.skip_egg_install_script') }}</label>
                        </div>

                        <p class="small text-muted no-margin">{{ __('admin/ui.if_the_selected_egg_has_an_install_script_attached_to_it_the_script_will_run_during_t') }}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.docker_configuration') }}</h3>
                </div>

                <div class="box-body row">
                    <div class="form-group col-xs-12">
                        <label for="pDefaultContainer">{{ __('admin/ui.docker_image') }}</label>
                        <select id="pDefaultContainer" name="image" class="form-control"></select>
                        <input id="pDefaultContainerCustom" name="custom_image" value="{{ old('custom_image') }}" class="form-control" placeholder="{{ __('admin/ui.or_enter_a_custom_image') }}" style="margin-top:1rem"/>
                        <p class="small text-muted no-margin">{{ __('admin/ui.this_is_the_default_docker_image_that_will_be_used_to_run_this_server_select_an_image') }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-md-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.startup_configuration') }}</h3>
                </div>

                <div class="box-body row">
                    <div class="form-group col-xs-12">
                        <label for="pStartup">{{ __('admin/ui.startup_command_230bb9') }}</label>
                        <input type="text" id="pStartup" name="startup" value="{{ old('startup') }}" class="form-control" />
                        <p class="small text-muted no-margin">{{ __('admin/ui.the_following_data_substitutes_are_available_for_the_startup_command') }} <code>@{{SERVER_MEMORY}}</code>, <code>@{{SERVER_IP}}</code>{{ __('admin/ui.and') }} <code>@{{SERVER_PORT}}</code>{{ __('admin/ui.they_will_be_replaced_with_the_allocated_memory_server_ip_and_server_port_respectivel') }}</p>
                    </div>
                </div>

                <div class="box-header with-border" style="margin-top:-10px;">
                    <h3 class="box-title">{{ __('admin/ui.service_variables') }}</h3>
                </div>

                <div class="box-body row" id="appendVariablesTo"></div>

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <input type="submit" class="btn btn-success pull-right" value="{{ __('admin/ui.create_server') }}" />
                </div>
            </div>
        </div>
    </div>
</form>
@include('admin.partials.quick-setup', ['createNode' => true])
@endsection

@section('footer-scripts')
    @parent
    {!! Theme::js('vendor/lodash/lodash.js') !!}

    <script type="application/javascript">
        // Persist 'Service Variables'
        function serviceVariablesUpdated(eggId, ids) {
            @if (old('egg_id'))
                // Check if the egg id matches.
                if (eggId != '{{ old('egg_id') }}') {
                    return;
                }

                @if (old('environment'))
                    @foreach (old('environment') as $key => $value)
                        $('#' + ids['{{ $key }}']).val('{{ $value }}');
                    @endforeach
                @endif
            @endif
            @if(old('image'))
                $('#pDefaultContainer').val('{{ old('image') }}').trigger('change.select2');
            @endif
        }
        // END Persist 'Service Variables'
    </script>

    {!! Theme::js('js/admin/new-server.js?v=20220530') !!}

    <script type="application/javascript">
        $(document).ready(function() {
            // Persist 'Server Owner' select2
            @if (old('owner_id'))
                $.ajax({
                    url: '/admin/users/accounts.json?user_id={{ old('owner_id') }}',
                    dataType: 'json',
                }).then(function (data) {
                    initUserIdSelect([ data ]);
                });
            @else
                initUserIdSelect();
            @endif
            // END Persist 'Server Owner' select2

            // Persist 'Node' select2
            @if (old('node_id'))
                $('#pNodeId').val('{{ old('node_id') }}').change();

                // Persist 'Default Allocation' select2
                @if (old('allocation_id'))
                    $('#pAllocation').val('{{ old('allocation_id') }}').change();
                @endif
                // END Persist 'Default Allocation' select2

                // Persist 'Additional Allocations' select2
                @if (old('allocation_additional'))
                    const additional_allocations = [];

                    @for ($i = 0; $i < count(old('allocation_additional')); $i++)
                        additional_allocations.push('{{ old('allocation_additional.'.$i)}}');
                    @endfor

                    $('#pAllocationAdditional').val(additional_allocations).change();
                @endif
                // END Persist 'Additional Allocations' select2
            @endif
            // END Persist 'Node' select2

            // Persist 'Nest' select2
            @if (old('nest_id'))
                $('#pNestId').val('{{ old('nest_id') }}').change();

                // Persist 'Egg' select2
                @if (old('egg_id'))
                    $('#pEggId').val('{{ old('egg_id') }}').change();
                @endif
                // END Persist 'Egg' select2
            @endif
            // END Persist 'Nest' select2
        });
    </script>
@endsection
