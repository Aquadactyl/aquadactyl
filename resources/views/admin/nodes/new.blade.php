@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.nodes_new') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.new_node') }}<small>{{ __('admin/ui.create_a_new_local_or_remote_node_for_servers_to_be_installed_to') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.nodes') }}">{{ __('admin/ui.nodes') }}</a></li>
        <li class="active">{{ __('admin/ui.new') }}</li>
    </ol>
@endsection

@section('content')
<form action="{{ route('admin.nodes.new') }}" method="POST">
    <div class="row">
        <div class="col-md-6">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.basic_details') }}</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="pCountry" class="form-label">{{ __('admin/ui.country') }}</label>
                        <select name="country_code" id="pCountry" class="form-control">
                            <option value="">{{ __('admin/ui.not_specified') }}</option>
                            @foreach(config('countries') as $code => $name)
                                <option value="{{ $code }}" {{ old('country_code') === $code ? 'selected' : '' }}>{{ $name }}</option>
                            @endforeach
                        </select>
                        <p class="text-muted small">{{ __('admin/ui.choose_the_hosting_country_to_display_its_flag_next_to_servers_on_this_node') }}</p>
                    </div>
                    <div class="form-group">
                        <label for="pQueryAddress" class="control-label">{{ __('admin/ui.game_query_address') }} <span class="field-optional" data-label="{{ __('admin/ui.optional') }}"></span></label>
                        <input data-sensitive type="text" name="query_address" id="pQueryAddress" class="form-control" value="{{ old('query_address') }}" />
                        <p class="text-muted small">{{ __('admin/ui.optional_address_the_panel_can_reach_for_game_queries_leave_blank_to_use_server_alloc') }}</p>
                    </div>
                    <div class="form-group">
                        <label for="pName" class="form-label">{{ __('admin/ui.name') }}</label>
                        <input type="text" name="name" id="pName" class="form-control" value="{{ old('name') }}"/>
                        <p class="text-muted small">{!! __('admin/ui.character_limits_a_za_z0_9_and_space_min_1_max_100_characters') !!}</p>
                    </div>
                    <div class="form-group">
                        <label for="pDescription" class="form-label">{{ __('admin/ui.description') }}</label>
                        <textarea name="description" id="pDescription" rows="4" class="form-control">{{ old('description') }}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="pLocationId" class="form-label">{{ __('admin/ui.location') }}</label>
                        <select name="location_id" id="pLocationId">
                            @foreach($locations as $location)
                                <option value="{{ $location->id }}" {{ $location->id != old('location_id') ?: 'selected' }}>{{ $location->short }}</option>
                            @endforeach
                        </select>
                        <button class="btn btn-link quick-create-location" type="button" data-toggle="modal" data-target="#quickSetupModal"><i class="fa fa-plus" aria-hidden="true"></i> {{ __('admin/management.create_location') }}</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">{{ __('admin/ui.node_visibility') }}</label>
                        <div>
                            <div class="radio radio-success radio-inline">

                                <input type="radio" id="pPublicTrue" value="1" name="public" checked>
                                <label for="pPublicTrue"> {{ __('admin/ui.public') }} </label>
                            </div>
                            <div class="radio radio-danger radio-inline">
                                <input type="radio" id="pPublicFalse" value="0" name="public">
                                <label for="pPublicFalse"> {{ __('admin/ui.private') }} </label>
                            </div>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.by_setting_a_node_to') }} <code>private</code> {{ __('admin/ui.you_will_be_denying_the_ability_to_auto_deploy_to_this_node') }}
                    </div>
                    <div class="form-group">
                        <label for="pFQDN" class="form-label">FQDN</label>
                        <input data-sensitive type="text" name="fqdn" id="pFQDN" class="form-control" value="{{ old('fqdn') }}"/>
                        <p class="text-muted small">{{ __('admin/ui.please_enter_domain_name_e_g') }} <code>node.example.com</code>{{ __('admin/ui.to_be_used_for_connecting_to_the_daemon_an_ip_address_may_be_used') }} <em>only</em> {{ __('admin/ui.if_you_are_not_using_ssl_for_this_node') }}</p>
                    </div>
                    <div class="form-group">
                        <label for="pSftpDomain" class="control-label">{{ __('admin/ui.custom_sftp_domain') }} <span class="field-optional" data-label="{{ __('admin/ui.optional') }}"></span></label>
                        <input data-sensitive type="text" name="sftp_domain" id="pSftpDomain" class="form-control" value="{{ old('sftp_domain') }}"/>
                        <p class="text-muted small">{{ __('admin/ui.optional_domain_or_ip_to_override_the_fqdn_for_all_sftp_logic_e_g_if_sftp_traffic_is') }}</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label">{{ __('admin/ui.communicate_over_ssl') }}</label>
                        <div>
                            <div class="radio radio-success radio-inline">
                                <input type="radio" id="pSSLTrue" value="https" name="scheme" checked>
                                <label for="pSSLTrue"> {{ __('admin/ui.use_ssl_connection') }}</label>
                            </div>
                            <div class="radio radio-danger radio-inline">
                                <input type="radio" id="pSSLFalse" value="http" name="scheme" @if(request()->isSecure()) disabled @endif>
                                <label for="pSSLFalse"> {{ __('admin/ui.use_http_connection') }}</label>
                            </div>
                        </div>
                        @if(request()->isSecure())
                            <p class="text-danger small">{!! __('admin/ui.your_panel_is_currently_configured_to_use_a_secure_connection_in_order_for_browsers_t') !!}</p>
                        @else
                            <p class="text-muted small">{{ __('admin/ui.in_most_cases_you_should_select_to_use_a_ssl_connection_if_using_an_ip_address_or_you') }}</p>
                        @endif
                    </div>
                    <div class="form-group">
                        <label class="form-label">{{ __('admin/ui.behind_proxy') }}</label>
                        <div>
                            <div class="radio radio-success radio-inline">
                                <input type="radio" id="pProxyFalse" value="0" name="behind_proxy" checked>
                                <label for="pProxyFalse"> {{ __('admin/ui.not_behind_proxy') }} </label>
                            </div>
                            <div class="radio radio-info radio-inline">
                                <input type="radio" id="pProxyTrue" value="1" name="behind_proxy">
                                <label for="pProxyTrue"> {{ __('admin/ui.behind_proxy') }} </label>
                            </div>
                        </div>
                        <p class="text-muted small">{{ __('admin/ui.if_you_are_running_the_daemon_behind_a_proxy_such_as_cloudflare_select_this_to_have_t') }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.configuration') }}</h3>
                </div>
                <div class="box-body">
                    <div class="row">
                        <div class="form-group col-xs-12">
                            <label for="pDaemonBase" class="form-label">{{ __('admin/ui.daemon_server_file_directory') }}</label>
                            <input type="text" name="daemonBase" id="pDaemonBase" class="form-control" value="/var/lib/pterodactyl/volumes" />
                            <p class="text-muted small">{!! __('admin/ui.enter_the_directory_where_server_files_should_be_stored_if_you_use_ovh_you_should_che') !!}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="form-group col-md-6">
                            <label for="pMemory" class="form-label">{{ __('admin/ui.total_memory') }}</label>
                            <div class="input-group">
                                <input type="text" name="memory" data-multiplicator="true" class="form-control" id="pMemory" value="{{ old('memory') }}"/>
                                <span class="input-group-addon">MiB</span>
                            </div>
                        </div>
                        <div class="form-group col-md-6">
                            <label for="pMemoryOverallocate" class="form-label">{{ __('admin/ui.memory_over_allocation') }}</label>
                            <div class="input-group">
                                <input type="text" name="memory_overallocate" class="form-control" id="pMemoryOverallocate" value="{{ old('memory_overallocate') }}"/>
                                <span class="input-group-addon">%</span>
                            </div>
                        </div>
                        <div class="col-md-12">
                            <p class="text-muted small">{!! __('admin/ui.enter_the_total_amount_of_memory_available_for_new_servers_if_you_would_like_to_allow') !!}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="form-group col-md-6">
                            <label for="pDisk" class="form-label">{{ __('admin/ui.total_disk_space') }}</label>
                            <div class="input-group">
                                <input type="text" name="disk" data-multiplicator="true" class="form-control" id="pDisk" value="{{ old('disk') }}"/>
                                <span class="input-group-addon">MiB</span>
                            </div>
                        </div>
                        <div class="form-group col-md-6">
                            <label for="pDiskOverallocate" class="form-label">{{ __('admin/ui.disk_over_allocation') }}</label>
                            <div class="input-group">
                                <input type="text" name="disk_overallocate" class="form-control" id="pDiskOverallocate" value="{{ old('disk_overallocate') }}"/>
                                <span class="input-group-addon">%</span>
                            </div>
                        </div>
                        <div class="col-md-12">
                            <p class="text-muted small">{!! __('admin/ui.enter_the_total_amount_of_disk_space_available_for_new_servers_if_you_would_like_to_a') !!}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="form-group col-md-6">
                            <label for="pUploadSize" class="form-label">{{ __('admin/ui.maximum_web_upload_filesize') }}</label>
                            <div class="input-group">
                                <input type="number" name="upload_size" class="form-control" id="pUploadSize" min="1" step="1" value="{{ old('upload_size', \Pterodactyl\Models\Node::DEFAULT_UPLOAD_SIZE) }}" />
                                <span class="input-group-addon">MiB</span>
                            </div>
                            <p class="text-muted small">{{ __('admin/ui.web_upload_limit_help') }}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="form-group col-md-6">
                            <label for="pDaemonListen" class="form-label">{{ __('admin/ui.daemon_port') }}</label>
                            <input type="text" name="daemonListen" class="form-control" id="pDaemonListen" value="8080" />
                        </div>
                        <div class="form-group col-md-6">
                            <label for="pDaemonSFTP" class="form-label">{{ __('admin/ui.daemon_sftp_port') }}</label>
                            <input type="text" name="daemonSFTP" class="form-control" id="pDaemonSFTP" value="2022" />
                        </div>
                        <div class="col-md-12">
                            <p class="text-muted small">{{ __('admin/ui.the_daemon_runs_its_own_sftp_management_container_and_does_not_use_the_sshd_process_o') }} <Strong>{{ __('admin/ui.do_not_use_the_same_port_that_you_have_assigned_for_your_physical_server_s_ssh_proces') }}</strong> {{ __('admin/ui.if_you_will_be_running_the_daemon_behind_cloudflare_you_should_set_the_daemon_port_to') }} <code>8443</code> {{ __('admin/ui.to_allow_websocket_proxying_over_ssl') }}</p>
                        </div>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-success pull-right">{{ __('admin/ui.create_node') }}</button>
                </div>
            </div>
        </div>
    </div>
</form>
@include('admin.partials.quick-setup', ['createNode' => false])
@endsection

@section('footer-scripts')
    @parent
    <script>
        $('#pLocationId').select2();
    </script>
@endsection
