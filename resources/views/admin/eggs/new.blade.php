@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.nests_new_egg') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.new_egg') }}<small>{{ __('admin/ui.create_a_new_egg_to_assign_to_servers') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.nests') }}">{{ __('admin/ui.nests') }}</a></li>
        <li class="active">{{ __('admin/ui.new_egg') }}</li>
    </ol>
@endsection

@section('content')
<form action="{{ route('admin.nests.egg.new') }}" method="POST">
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.configuration') }}</h3>
                </div>
                <div class="box-body">
                    <div class="row">
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="pNestId" class="form-label">{{ __('admin/ui.associated_nest') }}</label>
                                <div>
                                    <select name="nest_id" id="pNestId">
                                        @foreach($nests as $nest)
                                            <option value="{{ $nest->id }}" {{ old('nest_id') != $nest->id ?: 'selected' }}>{{ $nest->name }} &lt;{{ $nest->author }}&gt;</option>
                                        @endforeach
                                    </select>
                                    <p class="text-muted small">{{ __('admin/ui.think_of_a_nest_as_a_category_you_can_put_multiple_eggs_in_a_nest_but_consider_puttin') }}</p>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="pName" class="form-label">{{ __('admin/ui.name') }}</label>
                                <input type="text" id="pName" name="name" value="{{ old('name') }}" class="form-control" />
                                <p class="text-muted small">{{ __('admin/ui.a_simple_human_readable_name_to_use_as_an_identifier_for_this_egg_this_is_what_users') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pDescription" class="form-label">{{ __('admin/ui.description') }}</label>
                                <textarea id="pDescription" name="description" class="form-control" rows="8">{{ old('description') }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.a_description_of_this_egg') }}</p>
                            </div>
                            <div class="form-group">
                                <div class="checkbox checkbox-primary no-margin-bottom">
                                    <input id="pForceOutgoingIp" name="force_outgoing_ip" type="checkbox" value="1" {{ \Pterodactyl\Helpers\Utilities::checked('force_outgoing_ip', 0) }} />
                                    <label for="pForceOutgoingIp" class="strong">{{ __('admin/ui.force_outgoing_ip') }}</label>
                                    <p class="text-muted small">
                                        {{ __('admin/ui.forces_all_outgoing_network_traffic_to_have_its_source_ip_nated_to_the_ip_of_the_serv') }}
                                        <br>
                                        <strong>
                                            {{ __('admin/ui.enabling_this_option_will_disable_internal_networking_for_any_servers_using_this_egg') }}
                                        </strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="pDockerImage" class="control-label">{{ __('admin/ui.docker_images_ec15ab') }}</label>
                                <textarea id="pDockerImages" name="docker_images" rows="4" placeholder="ghcr.io/pterodactyl/yolks" class="form-control">{{ old('docker_images') }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.the_docker_images_available_to_servers_using_this_egg_enter_one_per_line_users_will_b') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pStartup" class="control-label">{{ __('admin/ui.startup_command_230bb9') }}</label>
                                <textarea id="pStartup" name="startup" class="form-control" rows="10">{{ old('startup') }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.the_default_startup_command_that_should_be_used_for_new_servers_created_with_this_egg') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pConfigFeatures" class="control-label">{{ __('admin/ui.features') }}</label>
                                <div>
                                    <select class="form-control" name="features[]" id="pConfigFeatures" multiple>
                                    </select>
                                    <p class="text-muted small">{{ __('admin/ui.additional_features_belonging_to_the_egg_useful_for_configuring_additional_panel_modi') }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.process_management') }}</h3>
                </div>
                <div class="box-body">
                    <div class="row">
                        <div class="col-xs-12">
                            <div class="alert alert-warning">
                                <p>{{ __('admin/ui.all_fields_are_required_unless_you_select_a_separate_option_from_the_copy_settings_fr') }}</p>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="pConfigFrom" class="form-label">{{ __('admin/ui.copy_settings_from') }}</label>
                                <select name="config_from" id="pConfigFrom" class="form-control">
                                    <option value="">{{ __('admin/ui.none') }}</option>
                                </select>
                                <p class="text-muted small">{{ __('admin/ui.if_you_would_like_to_default_to_settings_from_another_egg_select_it_from_the_dropdown') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pConfigStop" class="form-label">{{ __('admin/ui.stop_command') }}</label>
                                <input type="text" id="pConfigStop" name="config_stop" class="form-control" value="{{ old('config_stop') }}" />
                                <p class="text-muted small">{!! __('admin/ui.the_command_that_should_be_sent_to_server_processes_to_stop_them_gracefully_if_you_ne') !!}</p>
                            </div>
                            <div class="form-group">
                                <label for="pConfigLogs" class="form-label">{{ __('admin/ui.log_configuration') }}</label>
                                <textarea data-action="handle-tabs" id="pConfigLogs" name="config_logs" class="form-control" rows="6">{{ old('config_logs') }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.this_should_be_a_json_representation_of_where_log_files_are_stored_and_whether_or_not') }}</p>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="pConfigFiles" class="form-label">{{ __('admin/ui.configuration_files') }}</label>
                                <textarea data-action="handle-tabs" id="pConfigFiles" name="config_files" class="form-control" rows="6">{{ old('config_files') }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.this_should_be_a_json_representation_of_configuration_files_to_modify_and_what_parts') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pConfigStartup" class="form-label">{{ __('admin/ui.start_configuration') }}</label>
                                <textarea data-action="handle-tabs" id="pConfigStartup" name="config_startup" class="form-control" rows="6">{{ old('config_startup') }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.this_should_be_a_json_representation_of_what_values_the_daemon_should_be_looking_for') }}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-success btn-sm pull-right">{{ __('admin/ui.create') }}</button>
                </div>
            </div>
        </div>
    </div>
</form>
@endsection

@section('footer-scripts')
    @parent
    <script>
    $(document).ready(function() {
        $('#pNestId').select2().change();
        $('#pConfigFrom').select2();
    });
    $('#pNestId').on('change', function (event) {
        var eggs = Pterodactyl.nests?.[$(this).val()]?.eggs || [];
        $('#pConfigFrom').html('<option value="">None</option>').select2({
            data: $.map(eggs, function (item) {
                return {
                    id: item.id,
                    text: item.name + ' <' + item.author + '>',
                };
            }),
        });
    });
    $('textarea[data-action="handle-tabs"]').on('keydown', function(event) {
        if (event.keyCode === 9) {
            event.preventDefault();

            var curPos = $(this)[0].selectionStart;
            var prepend = $(this).val().substr(0, curPos);
            var append = $(this).val().substr(curPos);

            $(this).val(prepend + '    ' + append);
        }
    });
    $('#pConfigFeatures').select2({
        tags: true,
        selectOnClose: false,
        tokenSeparators: [',', ' '],
    });
    </script>
@endsection
