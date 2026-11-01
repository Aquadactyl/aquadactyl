@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.nests_egg') }} {{ $egg->name }} {{ __('admin/ui.install_script') }}
@endsection

@section('content-header')
    <h1>{{ $egg->name }}<small>{{ __('admin/ui.manage_the_install_script_for_this_egg') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.nests') }}">{{ __('admin/ui.nests') }}</a></li>
        <li><a href="{{ route('admin.nests.view', $egg->nest->id) }}">{{ $egg->nest->name }}</a></li>
        <li><a href="{{ route('admin.nests.egg.view', $egg->id) }}">{{ $egg->name }}</a></li>
        <li class="active">{{ $egg->name }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li><a href="{{ route('admin.nests.egg.view', $egg->id) }}">{{ __('admin/ui.configuration') }}</a></li>
                <li><a href="{{ route('admin.nests.egg.variables', $egg->id) }}">{{ __('admin/ui.variables') }}</a></li>
                <li class="active"><a href="{{ route('admin.nests.egg.scripts', $egg->id) }}">{{ __('admin/ui.install_script_6d37c8') }}</a></li>
            </ul>
        </div>
    </div>
</div>
<form action="{{ route('admin.nests.egg.scripts', $egg->id) }}" method="POST">
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.install_script_6d37c8') }}</h3>
                </div>
                @if(! is_null($egg->copyFrom))
                    <div class="box-body">
                        <div class="callout callout-warning no-margin">
                            {{ __('admin/ui.this_service_option_is_copying_installation_scripts_and_container_options_from') }} <a href="{{ route('admin.nests.egg.view', $egg->copyFrom->id) }}">{{ $egg->copyFrom->name }}</a>{{ __('admin/ui.any_changes_you_make_to_this_script_will_not_apply_unless_you_select_none_from_the_dr') }}
                        </div>
                    </div>
                @endif
                <div class="box-body no-padding">
                    <div id="editor_install"style="height:300px">{{ $egg->script_install }}</div>
                </div>
                <div class="box-body">
                    <div class="row">
                        <div class="form-group col-sm-4">
                            <label class="control-label">{{ __('admin/ui.copy_script_from') }}</label>
                            <select id="pCopyScriptFrom" name="copy_script_from">
                                <option value="">{{ __('admin/ui.none') }}</option>
                                @foreach($copyFromOptions as $opt)
                                    <option value="{{ $opt->id }}" {{ $egg->copy_script_from !== $opt->id ?: 'selected' }}>{{ $opt->name }}</option>
                                @endforeach
                            </select>
                            <p class="text-muted small">{{ __('admin/ui.if_selected_script_above_will_be_ignored_and_script_from_selected_option_will_be_used') }}</p>
                        </div>
                        <div class="form-group col-sm-4">
                            <label class="control-label">{{ __('admin/ui.script_container') }}</label>
                            <input type="text" name="script_container" class="form-control" value="{{ $egg->script_container }}" />
                            <p class="text-muted small">{{ __('admin/ui.docker_container_to_use_when_running_this_script_for_the_server') }}</p>
                        </div>
                        <div class="form-group col-sm-4">
                            <label class="control-label">{{ __('admin/ui.script_entrypoint_command') }}</label>
                            <input type="text" name="script_entry" class="form-control" value="{{ $egg->script_entry }}" />
                            <p class="text-muted small">{{ __('admin/ui.the_entrypoint_command_to_use_for_this_script') }}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-xs-12 text-muted">
                            {{ __('admin/ui.the_following_service_options_rely_on_this_script') }}
                            @if(count($relyOnScript) > 0)
                                @foreach($relyOnScript as $rely)
                                    <a href="{{ route('admin.nests.egg.view', $rely->id) }}">
                                        <code>{{ $rely->name }}</code>@if(!$loop->last),&nbsp;@endif
                                    </a>
                                @endforeach
                            @else
                                <em>none</em>
                            @endif
                        </div>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <textarea name="script_install" class="hidden"></textarea>
                    <button type="submit" name="_method" value="PATCH" class="btn btn-primary btn-sm pull-right">{{ __('admin/ui.save') }}</button>
                </div>
            </div>
        </div>
    </div>
</form>
@endsection

@section('footer-scripts')
    @parent
    {!! Theme::js('vendor/ace/ace.js') !!}
    {!! Theme::js('vendor/ace/ext-modelist.js') !!}
    {!! Theme::js('vendor/ace/theme-tomorrow_night.js') !!}
    <script>
    $(document).ready(function () {
        $('#pCopyScriptFrom').select2();

        const InstallEditor = ace.edit('editor_install');
        const Modelist = ace.require('ace/ext/modelist')

        InstallEditor.setTheme('ace/theme/tomorrow_night');
        InstallEditor.getSession().setMode('ace/mode/sh');
        InstallEditor.getSession().setUseWrapMode(true);
        InstallEditor.setShowPrintMargin(false);

        $('form').on('submit', function (e) {
            $('textarea[name="script_install"]').val(InstallEditor.getValue());
        });
    });
    </script>

@endsection
