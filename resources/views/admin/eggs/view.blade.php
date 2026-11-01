@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.nests_egg') }} {{ $egg->name }}
@endsection

@section('content-header')
    <h1>{{ $egg->name }}<small>{{ str_limit($egg->description, 50) }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.nests') }}">{{ __('admin/ui.nests') }}</a></li>
        <li><a href="{{ route('admin.nests.view', $egg->nest->id) }}">{{ $egg->nest->name }}</a></li>
        <li class="active">{{ $egg->name }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li class="active"><a href="{{ route('admin.nests.egg.view', $egg->id) }}">{{ __('admin/ui.configuration') }}</a></li>
                <li><a href="{{ route('admin.nests.egg.variables', $egg->id) }}">{{ __('admin/ui.variables') }}</a></li>
                <li><a href="{{ route('admin.nests.egg.scripts', $egg->id) }}">{{ __('admin/ui.install_script_6d37c8') }}</a></li>
            </ul>
        </div>
    </div>
</div>
<form action="{{ route('admin.nests.egg.view', $egg->id) }}" enctype="multipart/form-data" method="POST">
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-danger">
                <div class="box-body">
                    <div class="row">
                        <div class="col-xs-8">
                            <div class="form-group no-margin-bottom">
                                <label for="pName" class="control-label">{{ __('admin/ui.egg_file') }}</label>
                                <div>
                                    <input type="file" name="import_file" class="form-control" style="border: 0;margin-left:-10px;" />
                                    <p class="text-muted small no-margin-bottom">{{ __('admin/ui.if_you_would_like_to_replace_settings_for_this_egg_by_uploading_a_new_json_file_simpl') }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-xs-4">
                            {!! csrf_field() !!}
                            <button type="submit" name="_method" value="PUT" class="btn btn-sm btn-danger pull-right">{{ __('admin/ui.update_egg') }}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>
<form action="{{ route('admin.nests.egg.view', $egg->id) }}" method="POST">
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
                                <label for="pName" class="control-label">{{ __('admin/ui.name') }} <span class="field-required" data-label="{{ __('admin/ui.required') }}"></span></label>
                                <input type="text" id="pName" name="name" value="{{ $egg->name }}" class="form-control" />
                                <p class="text-muted small">{{ __('admin/ui.a_simple_human_readable_name_to_use_as_an_identifier_for_this_egg') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pUuid" class="control-label">{{ __('admin/ui.uuid') }}</label>
                                <input type="text" id="pUuid" readonly value="{{ $egg->uuid }}" class="form-control" />
                                <p class="text-muted small">{{ __('admin/ui.this_is_the_globally_unique_identifier_for_this_egg_which_the_daemon_uses_as_an_ident') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pAuthor" class="control-label">{{ __('admin/ui.author_d95082') }}</label>
                                <input type="text" id="pAuthor" readonly value="{{ $egg->author }}" class="form-control" />
                                <p class="text-muted small">{{ __('admin/ui.the_author_of_this_version_of_the_egg_uploading_a_new_egg_configuration_from_a_differ') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pDockerImage" class="control-label">{{ __('admin/ui.docker_images_ec15ab') }} <span class="field-required" data-label="{{ __('admin/ui.required') }}"></span></label>
                                <textarea id="pDockerImages" name="docker_images" class="form-control" rows="4">{{ implode(PHP_EOL, $images) }}</textarea>
                                <p class="text-muted small">{!! __('admin/ui.the_docker_images_available_to_servers_using_this_egg_enter_one_per_line_users_will_b_f807e4') !!}</p>
                            </div>
                            <div class="form-group">
                                <div class="checkbox checkbox-primary no-margin-bottom">
                                    <input id="pForceOutgoingIp" name="force_outgoing_ip" type="checkbox" value="1" @if($egg->force_outgoing_ip) checked @endif />
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
                                <label for="pDescription" class="control-label">{{ __('admin/ui.description') }}</label>
                                <textarea id="pDescription" name="description" class="form-control" rows="8">{{ $egg->description }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.a_description_of_this_egg_that_will_be_displayed_throughout_the_panel_as_needed') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pStartup" class="control-label">{{ __('admin/ui.startup_command_230bb9') }} <span class="field-required" data-label="{{ __('admin/ui.required') }}"></span></label>
                                <textarea id="pStartup" name="startup" class="form-control" rows="8">{{ $egg->startup }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.the_default_startup_command_that_should_be_used_for_new_servers_using_this_egg') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pConfigFeatures" class="control-label">{{ __('admin/ui.features') }}</label>
                                <div>
                                    <select class="form-control" name="features[]" id="pConfigFeatures" multiple>
                                        @foreach(($egg->features ?? []) as $feature)
                                            <option value="{{ $feature }}" selected>{{ $feature }}</option>
                                        @endforeach
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
                                <p>{{ __('admin/ui.the_following_configuration_options_should_not_be_edited_unless_you_understand_how_th') }}</p>
                                <p>{{ __('admin/ui.all_fields_are_required_unless_you_select_a_separate_option_from_the_copy_settings_fr_97eedd') }}</p>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="pConfigFrom" class="form-label">{{ __('admin/ui.copy_settings_from') }}</label>
                                <select name="config_from" id="pConfigFrom" class="form-control">
                                    <option value="">{{ __('admin/ui.none') }}</option>
                                    @foreach($egg->nest->eggs as $o)
                                        <option value="{{ $o->id }}" {{ ($egg->config_from !== $o->id) ?: 'selected' }}>{{ $o->name }} &lt;{{ $o->author }}&gt;</option>
                                    @endforeach
                                </select>
                                <p class="text-muted small">{{ __('admin/ui.if_you_would_like_to_default_to_settings_from_another_egg_select_it_from_the_menu_abo') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pConfigStop" class="form-label">{{ __('admin/ui.stop_command') }}</label>
                                <input type="text" id="pConfigStop" name="config_stop" class="form-control" value="{{ $egg->config_stop }}" />
                                <p class="text-muted small">{!! __('admin/ui.the_command_that_should_be_sent_to_server_processes_to_stop_them_gracefully_if_you_ne') !!}</p>
                            </div>
                            <div class="form-group">
                                <label for="pConfigLogs" class="form-label">{{ __('admin/ui.log_configuration') }}</label>
                                <textarea data-action="handle-tabs" id="pConfigLogs" name="config_logs" class="form-control" rows="6">{{ ! is_null($egg->config_logs) ? json_encode(json_decode($egg->config_logs), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) : '' }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.this_should_be_a_json_representation_of_where_log_files_are_stored_and_whether_or_not') }}</p>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="pConfigFiles" class="form-label">{{ __('admin/ui.configuration_files') }}</label>
                                <textarea data-action="handle-tabs" id="pConfigFiles" name="config_files" class="form-control" rows="6">{{ ! is_null($egg->config_files) ? json_encode(json_decode($egg->config_files), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) : '' }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.this_should_be_a_json_representation_of_configuration_files_to_modify_and_what_parts') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="pConfigStartup" class="form-label">{{ __('admin/ui.start_configuration') }}</label>
                                <textarea data-action="handle-tabs" id="pConfigStartup" name="config_startup" class="form-control" rows="6">{{ ! is_null($egg->config_startup) ? json_encode(json_decode($egg->config_startup), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) : '' }}</textarea>
                                <p class="text-muted small">{{ __('admin/ui.this_should_be_a_json_representation_of_what_values_the_daemon_should_be_looking_for') }}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" name="_method" value="PATCH" class="btn btn-primary btn-sm pull-right">{{ __('admin/ui.save') }}</button>
                    <a href="{{ route('admin.nests.egg.export', $egg->id) }}" class="btn btn-sm btn-info pull-right" style="margin-right:10px;">{{ __('admin/ui.export') }}</a>
                    <button id="deleteButton" type="submit" name="_method" value="DELETE" class="btn btn-danger btn-sm muted muted-hover">
                        <i class="fa fa-trash-o"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</form>
@endsection

@section('footer-scripts')
    @parent
    <script>
    $('#pConfigFrom').select2();
    $('#deleteButton').on('mouseenter', function (event) {
        $(this).find('i').html(' Delete Egg');
    }).on('mouseleave', function (event) {
        $(this).find('i').html('');
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
