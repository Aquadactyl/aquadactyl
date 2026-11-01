@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.server_acb823') }} {{ $server->name }}{{ __('admin/ui.startup_4f80bd') }}
@endsection

@section('content-header')
    <h1>{{ $server->name }}<small>{{ __('admin/ui.control_startup_command_as_well_as_variables') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.servers') }}">{{ __('admin/ui.servers') }}</a></li>
        <li><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></li>
        <li class="active">{{ __('admin/ui.startup') }}</li>
    </ol>
@endsection

@section('content')
@include('admin.servers.partials.navigation')
<form action="{{ route('admin.servers.view.startup', $server->id) }}" method="POST">
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.startup_command_modification') }}</h3>
                </div>
                <div class="box-body">
                    <label for="pStartup" class="form-label">{{ __('admin/ui.startup_command_230bb9') }}</label>
                    <input id="pStartup" name="startup" class="form-control" type="text" value="{{ old('startup', $server->startup) }}" />
                    <p class="small text-muted">{{ __('admin/ui.edit_your_server_s_startup_command_here_the_following_variables_are_available_by_defa') }} <code>@{{SERVER_MEMORY}}</code>, <code>@{{SERVER_IP}}</code>{{ __('admin/ui.and') }} <code>@{{SERVER_PORT}}</code>.</p>
                </div>
                <div class="box-body">
                    <label for="pDefaultStartupCommand" class="form-label">{{ __('admin/ui.default_service_start_command') }}</label>
                    <input id="pDefaultStartupCommand" class="form-control" type="text" readonly />
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary btn-sm pull-right">{{ __('admin/ui.save_modifications') }}</button>
                </div>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.service_configuration') }}</h3>
                </div>
                <div class="box-body row">
                    <div class="col-xs-12">
                        <p class="small text-danger">
                            {{ __('admin/ui.changing_any_of_the_below_values_will_result_in_the_server_processing_a_re_install_co') }}
                        </p>
                        <p class="small text-danger">{!! __('admin/ui.this_is_a_destructive_operation_in_many_cases_this_server_will_be_stopped_immediately') !!}</p>
                    </div>
                    <div class="form-group col-xs-12">
                        <label for="pNestId">{{ __('admin/ui.nest') }}</label>
                        <select name="nest_id" id="pNestId" class="form-control">
                            @foreach($nests as $nest)
                                <option value="{{ $nest->id }}"
                                    @if($nest->id === $server->nest_id)
                                        selected
                                    @endif
                                >{{ $nest->name }}</option>
                            @endforeach
                        </select>
                        <p class="small text-muted no-margin">{{ __('admin/ui.select_the_nest_that_this_server_will_be_grouped_into') }}</p>
                    </div>
                    <div class="form-group col-xs-12">
                        <label for="pEggId">{{ __('admin/ui.egg_37c50c') }}</label>
                        <select name="egg_id" id="pEggId" class="form-control"></select>
                        <p class="small text-muted no-margin">{{ __('admin/ui.select_the_egg_that_will_provide_processing_data_for_this_server') }}</p>
                    </div>
                    <div class="form-group col-xs-12">
                        <div class="checkbox checkbox-primary no-margin-bottom">
                            <input id="pSkipScripting" name="skip_scripts" type="checkbox" value="1" @if($server->skip_scripts) checked @endif />
                            <label for="pSkipScripting" class="strong">{{ __('admin/ui.skip_egg_install_script') }}</label>
                        </div>
                        <p class="small text-muted no-margin">{{ __('admin/ui.if_the_selected_egg_has_an_install_script_attached_to_it_the_script_will_run_during_i') }}</p>
                    </div>
                </div>
            </div>
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.docker_image_configuration') }}</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="pDockerImage">{{ __('admin/ui.image') }}</label>
                        <select id="pDockerImage" name="docker_image" class="form-control"></select>
                        <input id="pDockerImageCustom" name="custom_docker_image" value="{{ old('custom_docker_image') }}" class="form-control" placeholder="{{ __('admin/ui.or_enter_a_custom_image') }}" style="margin-top:1rem"/>
                        <p class="small text-muted no-margin">{{ __('admin/ui.this_is_the_docker_image_that_will_be_used_to_run_this_server_select_an_image_from_th') }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="row" id="appendVariablesTo"></div>
        </div>
    </div>
</form>
@endsection

@section('footer-scripts')
    @parent
    <script>
    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    $(document).ready(function () {
        $('#pEggId').select2({placeholder: @json(__('admin/ui.select_a_nest_egg'))}).on('change', function () {
            var selectedEgg = $(this).val() == null ? $(this).find('option').first().val() : $(this).val();
            var parentChain = Pterodactyl.nests?.[$("#pNestId").val()];
            var objectChain = parentChain?.eggs?.[selectedEgg];

            const images = objectChain?.docker_images || [];
            $('#pDockerImage').html('');
            const keys = Object.keys(images);
            for (let i = 0; i < keys.length; i++) {
                let opt = document.createElement('option');
                opt.value = images[keys[i]];
                opt.innerText = keys[i] + " (" + images[keys[i]] + ")";
                if (objectChain && objectChain.id === parseInt(Pterodactyl.server.egg_id) && Pterodactyl.server.image == opt.value) {
                    opt.selected = true;
                }
                $('#pDockerImage').append(opt);
            }
            $('#pDockerImage').on('change', function () {
                $('#pDockerImageCustom').val('');
            });

            if (objectChain && objectChain.id === parseInt(Pterodactyl.server.egg_id)) {
                if ($('#pDockerImage').val() != Pterodactyl.server.image) {
                    $('#pDockerImageCustom').val(Pterodactyl.server.image);
                }
            }

            if (!objectChain?.startup) {
                $('#pDefaultStartupCommand').val(parentChain?.startup ?? 'ERROR: Startup Not Defined!');
            } else {
                $('#pDefaultStartupCommand').val(objectChain.startup);
            }

            $('#appendVariablesTo').html('');
            $.each(objectChain?.variables || [], function (i, item) {
                var setValue = Pterodactyl.server_variables?.[item.env_variable] ?? item.default_value;
                var isRequired = (item.required === 1) ? '<span class="label label-danger">Required</span> ' : '';
                var dataAppend = ' \
                    <div class="col-xs-12"> \
                        <div class="box"> \
                            <div class="box-header with-border"> \
                                <h3 class="box-title">' + isRequired + escapeHtml(item.name) + '</h3> \
                            </div> \
                            <div class="box-body"> \
                                <input name="environment[' + escapeHtml(item.env_variable) + ']" class="form-control" type="text" id="egg_variable_' + escapeHtml(item.env_variable) + '" /> \
                                <p class="no-margin small text-muted">' + escapeHtml(item.description) + '</p> \
                            </div> \
                            <div class="box-footer"> \
                                <p class="no-margin text-muted small"><strong>Startup Command Variable:</strong> <code>' + escapeHtml(item.env_variable) + '</code></p> \
                                <p class="no-margin text-muted small"><strong>Input Rules:</strong> <code>' + escapeHtml(item.rules) + '</code></p> \
                            </div> \
                        </div> \
                    </div>';
                $('#appendVariablesTo').append(dataAppend).find('#egg_variable_' + item.env_variable).val(setValue);
            });
        });

        $('#pNestId').select2({placeholder: @json(__('admin/ui.select_a_nest'))}).on('change', function () {
            var eggs = Pterodactyl.nests?.[$(this).val()]?.eggs || [];
            $('#pEggId').html('').select2({
                data: $.map(eggs, function (item) {
                    return {
                        id: item.id,
                        text: item.name,
                    };
                }),
            });

            var nestEgg = Pterodactyl.nests?.[$(this).val()]?.eggs?.[Pterodactyl.server.egg_id];
            if (typeof nestEgg === 'object' && nestEgg !== null) {
                $('#pEggId').val(Pterodactyl.server.egg_id);
            }

            $('#pEggId').change();
        }).change();
    });
    </script>
@endsection
