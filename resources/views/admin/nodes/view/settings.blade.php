@extends('layouts.admin')

@section('title')
    {{ $node->name }}{{ __('admin/ui.settings_ad11ce') }}
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>{{ __('admin/ui.configure_your_node_settings') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.nodes') }}">{{ __('admin/ui.nodes') }}</a></li>
        <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></li>
        <li class="active">{{ __('admin/ui.settings') }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ __('admin/ui.about') }}</a></li>
                <li class="active"><a href="{{ route('admin.nodes.view.settings', $node->id) }}">{{ __('admin/ui.settings') }}</a></li>
                <li><a href="{{ route('admin.nodes.view.configuration', $node->id) }}">{{ __('admin/ui.configuration') }}</a></li>
                <li><a href="{{ route('admin.nodes.view.allocation', $node->id) }}">{{ __('admin/ui.allocation') }}</a></li>
                <li><a href="{{ route('admin.nodes.view.servers', $node->id) }}">{{ __('admin/ui.servers') }}</a></li>
            </ul>
        </div>
    </div>
</div>
<form action="{{ route('admin.nodes.view.settings', $node->id) }}" method="POST">
    <div class="row">
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.settings') }}</h3>
                </div>
                <div class="box-body row">
                    <div class="form-group col-xs-12">
                        <label for="name" class="control-label">{{ __('admin/ui.node_name') }}</label>
                        <div>
                            <input type="text" autocomplete="off" name="name" class="form-control" value="{{ old('name', $node->name) }}" />
                            <p class="text-muted"><small>{{ __('admin/ui.character_limits') }} <code>a-zA-Z0-9_.-</code> and <code>[Space]</code> {{ __('admin/ui.min_1_max_100_characters') }}</small></p>
                        </div>
                    </div>
                    <div class="form-group col-xs-12">
                        <label for="pCountry" class="control-label">{{ __('admin/ui.country') }}</label>
                        <select name="country_code" id="pCountry" class="form-control">
                            <option value="">{{ __('admin/ui.not_specified') }}</option>
                            @foreach(config('countries') as $code => $name)
                                <option value="{{ $code }}" {{ old('country_code', $node->country_code) === $code ? 'selected' : '' }}>{{ $name }}</option>
                            @endforeach
                        </select>
                        <p class="text-muted small">{{ __('admin/ui.choose_the_hosting_country_to_display_its_flag_next_to_servers_on_this_node') }}</p>
                    </div>
                    <div class="form-group col-xs-12">
                        <label for="pQueryAddress" class="control-label">{{ __('admin/ui.game_query_address') }} <span class="field-optional" data-label="{{ __('admin/ui.optional') }}"></span></label>
                        <input data-sensitive type="text" name="query_address" id="pQueryAddress" class="form-control" value="{{ old('query_address', $node->query_address) }}" />
                        <p class="text-muted small">{{ __('admin/ui.optional_address_the_panel_can_reach_for_game_queries_leave_blank_to_use_server_alloc') }}</p>
                    </div>
                    <div class="form-group col-xs-12">
                        <label for="description" class="control-label">{{ __('admin/ui.description') }}</label>
                        <div>
                            <textarea name="description" id="description" rows="4" class="form-control">{{ $node->description }}</textarea>
                        </div>
                    </div>
                    <div class="form-group col-xs-12">
                        <label for="name" class="control-label">{{ __('admin/ui.location') }}</label>
                        <div>
                            <select name="location_id" class="form-control">
                                @foreach($locations as $location)
                                    <option value="{{ $location->id }}" {{ (((int) old('location_id', $node->location_id)) === $location->id) ? 'selected' : '' }}>{{ $location->long }} ({{ $location->short }})</option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                    <div class="form-group col-xs-12">
                        <label for="public" class="control-label">{{ __('admin/ui.allow_automatic_allocation') }} <sup><a data-toggle="tooltip" data-placement="top" title="{{ __('admin/ui.allow_automatic_allocation_to_this_node') }}">?</a></sup></label>
                        <div>
                            <input type="radio" name="public" value="1" {{ (old('public', $node->public)) ? 'checked' : '' }} id="public_1" checked> <label for="public_1" style="padding-left:5px;">{{ __('admin/ui.yes') }}</label><br />
                            <input type="radio" name="public" value="0" {{ (old('public', $node->public)) ? '' : 'checked' }} id="public_0"> <label for="public_0" style="padding-left:5px;">{{ __('admin/ui.no') }}</label>
                        </div>
                    </div>
                    <div class="form-group col-xs-12">
                        <label for="fqdn" class="control-label">{{ __('admin/ui.fully_qualified_domain_name') }}</label>
                        <div>
                            <input data-sensitive type="text" autocomplete="off" name="fqdn" class="form-control" value="{{ old('fqdn', $node->fqdn) }}" />
                        </div>
                        <p class="text-muted"><small>{{ __('admin/ui.please_enter_domain_name_e_g') }} <code>node.example.com</code>{{ __('admin/ui.to_be_used_for_connecting_to_the_daemon_an_ip_address_may_only_be_used_if_you_are_not') }}
                                <a tabindex="0" data-toggle="popover" data-trigger="focus" title="{{ __('admin/ui.why_do_i_need_a_fqdn') }}" data-content="In order to secure communications between your server and this node we use SSL. We cannot generate a SSL certificate for IP Addresses, and as such you will need to provide a FQDN.">{{ __('admin/ui.why') }}</a>
                            </small></p>
                    </div>
                    <div class="form-group col-xs-12">
                        <label for="sftp_domain" class="control-label">{{ __('admin/ui.custom_sftp_domain') }} <span class="field-optional" data-label="{{ __('admin/ui.optional') }}"></span></label>
                        <div>
                            <input data-sensitive type="text" autocomplete="off" name="sftp_domain" class="form-control" value="{{ old('sftp_domain', $node->sftp_domain) }}" placeholder="{{ $node->fqdn }}" />
                        </div>
                        <p class="text-muted"><small>{{ __('admin/ui.optional_domain_or_ip_to_override_the_fqdn_for_all_sftp_logic_e_g_if_sftp_traffic_is') }}</small></p>
                    </div>
                    <div class="form-group col-xs-12">
                        <label class="form-label"><span class="label label-warning"><i class="fa fa-power-off"></i></span> {{ __('admin/ui.communicate_over_ssl') }}</label>
                        <div>
                            <div class="radio radio-success radio-inline">
                                <input type="radio" id="pSSLTrue" value="https" name="scheme" {{ (old('scheme', $node->scheme) === 'https') ? 'checked' : '' }}>
                                <label for="pSSLTrue"> {{ __('admin/ui.use_ssl_connection') }}</label>
                            </div>
                            <div class="radio radio-danger radio-inline">
                                <input type="radio" id="pSSLFalse" value="http" name="scheme" {{ (old('scheme', $node->scheme) !== 'https') ? 'checked' : '' }}>
                                <label for="pSSLFalse"> {{ __('admin/ui.use_http_connection') }}</label>
                            </div>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.in_most_cases_you_should_select_to_use_a_ssl_connection_if_using_an_ip_address_or_you') }}</p>
                    </div>
                    <div class="form-group col-xs-12">
                        <label class="form-label"><span class="label label-warning"><i class="fa fa-power-off"></i></span> {{ __('admin/ui.behind_proxy') }}</label>
                        <div>
                            <div class="radio radio-success radio-inline">
                                <input type="radio" id="pProxyFalse" value="0" name="behind_proxy" {{ (old('behind_proxy', $node->behind_proxy) == false) ? 'checked' : '' }}>
                                <label for="pProxyFalse"> {{ __('admin/ui.not_behind_proxy') }} </label>
                            </div>
                            <div class="radio radio-info radio-inline">
                                <input type="radio" id="pProxyTrue" value="1" name="behind_proxy" {{ (old('behind_proxy', $node->behind_proxy) == true) ? 'checked' : '' }}>
                                <label for="pProxyTrue"> {{ __('admin/ui.behind_proxy') }} </label>
                            </div>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.if_you_are_running_the_daemon_behind_a_proxy_such_as_cloudflare_select_this_to_have_t') }}</p>
                    </div>
                    <div class="form-group col-xs-12">
                        <label class="form-label"><span class="label label-warning"><i class="fa fa-wrench"></i></span> {{ __('admin/ui.maintenance_mode') }}</label>
                        <div>
                            <div class="radio radio-success radio-inline">
                                <input type="radio" id="pMaintenanceFalse" value="0" name="maintenance_mode" {{ (old('maintenance_mode', $node->maintenance_mode) == false) ? 'checked' : '' }}>
                                <label for="pMaintenanceFalse"> {{ __('admin/ui.disabled') }}</label>
                            </div>
                            <div class="radio radio-warning radio-inline">
                                <input type="radio" id="pMaintenanceTrue" value="1" name="maintenance_mode" {{ (old('maintenance_mode', $node->maintenance_mode) == true) ? 'checked' : '' }}>
                                <label for="pMaintenanceTrue"> {{ __('admin/ui.enabled') }}</label>
                            </div>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.if_the_node_is_marked_as_under_maintenance_users_won_t_be_able_to_access_servers_that') }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.allocation_limits') }}</h3>
                </div>
                <div class="box-body row">
                    <div class="col-xs-12">
                        <div class="row">
                            <div class="form-group col-xs-6">
                                <label for="memory" class="control-label">{{ __('admin/ui.total_memory') }}</label>
                                <div class="input-group">
                                    <input type="text" name="memory" class="form-control" data-multiplicator="true" value="{{ old('memory', $node->memory) }}"/>
                                    <span class="input-group-addon">MiB</span>
                                </div>
                            </div>
                            <div class="form-group col-xs-6">
                                <label for="memory_overallocate" class="control-label">{{ __('admin/ui.overallocate') }}</label>
                                <div class="input-group">
                                    <input type="text" name="memory_overallocate" class="form-control" value="{{ old('memory_overallocate', $node->memory_overallocate) }}"/>
                                    <span class="input-group-addon">%</span>
                                </div>
                            </div>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.enter_the_total_amount_of_memory_available_on_this_node_for_allocation_to_servers_you') }}</p>
                    </div>
                    <div class="col-xs-12">
                        <div class="row">
                            <div class="form-group col-xs-6">
                                <label for="disk" class="control-label">{{ __('admin/ui.disk_space') }}</label>
                                <div class="input-group">
                                    <input type="text" name="disk" class="form-control" data-multiplicator="true" value="{{ old('disk', $node->disk) }}"/>
                                    <span class="input-group-addon">MiB</span>
                                </div>
                            </div>
                            <div class="form-group col-xs-6">
                                <label for="disk_overallocate" class="control-label">{{ __('admin/ui.overallocate') }}</label>
                                <div class="input-group">
                                    <input type="text" name="disk_overallocate" class="form-control" value="{{ old('disk_overallocate', $node->disk_overallocate) }}"/>
                                    <span class="input-group-addon">%</span>
                                </div>
                            </div>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.enter_the_total_amount_of_disk_space_available_on_this_node_for_server_allocation_you') }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-sm-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.general_configuration') }}</h3>
                </div>
                <div class="box-body row">
                    <div class="form-group col-xs-12">
                        <label for="upload_size" class="control-label">{{ __('admin/ui.maximum_web_upload_filesize') }}</label>
                        <div class="input-group">
                            <input type="number" name="upload_size" id="upload_size" class="form-control" min="1" step="1" value="{{ old('upload_size', $node->upload_size) }}"/>
                            <span class="input-group-addon">MiB</span>
                        </div>
                        <p class="text-muted"><small>{{ __('admin/ui.web_upload_limit_help') }}</small></p>
                    </div>
                    <div class="col-xs-12">
                        <div class="row">
                            <div class="form-group col-md-6">
                                <label for="daemonListen" class="control-label"><span class="label label-warning"><i class="fa fa-power-off"></i></span> {{ __('admin/ui.daemon_port') }}</label>
                                <div>
                                    <input type="text" name="daemonListen" class="form-control" value="{{ old('daemonListen', $node->daemonListen) }}"/>
                                </div>
                            </div>
                            <div class="form-group col-md-6">
                                <label for="daemonSFTP" class="control-label"><span class="label label-warning"><i class="fa fa-power-off"></i></span> {{ __('admin/ui.daemon_sftp_port') }}</label>
                                <div>
                                    <input type="text" name="daemonSFTP" class="form-control" value="{{ old('daemonSFTP', $node->daemonSFTP) }}"/>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12">
                                <p class="text-muted"><small>{{ __('admin/ui.the_daemon_runs_its_own_sftp_management_container_and_does_not_use_the_sshd_process_o') }} <Strong>{{ __('admin/ui.do_not_use_the_same_port_that_you_have_assigned_for_your_physical_server_s_ssh_proces') }}</strong></small></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-xs-12">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.save_settings') }}</h3>
                </div>
                <div class="box-body row">
                    <div class="form-group col-sm-6">
                        <div>
                            <input type="checkbox" name="reset_secret" id="reset_secret" /> <label for="reset_secret" class="control-label">{{ __('admin/ui.reset_daemon_master_key') }}</label>
                        </div>
                        <p class="text-muted"><small>{{ __('admin/ui.resetting_the_daemon_master_key_will_void_any_request_coming_from_the_old_key_this_ke') }}</small></p>
                    </div>
                </div>
                <div class="box-footer">
                    {!! method_field('PATCH') !!}
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary pull-right">{{ __('admin/ui.save_changes') }}</button>
                </div>
            </div>
        </div>
    </div>
</form>
@endsection

@section('footer-scripts')
    @parent
    <script>
    $('[data-toggle="popover"]').popover({
        placement: 'auto'
    });
    $('select[name="location_id"]').select2();
    </script>
@endsection
