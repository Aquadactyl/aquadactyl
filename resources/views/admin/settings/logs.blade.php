@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'logs'])

@section('title', __('admin/custom.logs'))

@section('content-header')
    <h1>{{ __('admin/custom.logs') }}<small>{{ __('admin/custom.logs_description') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index', [], false) }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.settings', [], false) }}">{{ __('admin/ui.settings') }}</a></li>
        <li class="active">{{ __('admin/custom.logs') }}</li>
    </ol>
@endsection

@section('content')
    @yield('settings::nav')

    <div class="row">
        <div class="col-xs-12">
            <div class="box box-default">
                <div class="box-body" style="padding: 16px;">
                    <form method="GET" action="{{ route('admin.settings.logs', [], false) }}" id="log-file-form">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="select-log-file" class="control-label" style="margin-bottom: 6px; display: block;">
                                {{ __('admin/custom.log_files') }}
                            </label>
                            <select id="select-log-file" name="file" class="form-control" style="width: 100%;">
                                @forelse($files as $file)
                                    <option value="{{ $file['name'] }}" @selected($currentFile && $currentFile['name'] === $file['name'])>
                                        {{ $file['name'] }} ({{ $file['size'] }}) — {{ $file['modified_formatted'] }}
                                    </option>
                                @empty
                                    <option disabled selected>{{ __('admin/custom.no_logs_found') }}</option>
                                @endforelse
                            </select>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    @if(!$currentFile)
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-solid">
                    <div class="box-body text-center" style="padding: 48px 24px;">
                        <h4 class="text-muted">{{ __('admin/custom.no_logs_found') }}</h4>
                    </div>
                </div>
            </div>
        </div>
    @else
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-solid">
                    <div class="box-header with-border">
                        <h3 class="box-title" style="font-size: 14px; font-weight: 600;">
                            {{ $currentFile['name'] }}
                            <small class="text-muted" style="margin-left: 8px;">{{ $currentFile['size'] }} &bull; {{ $currentFile['modified_formatted'] }}</small>
                        </h3>
                    </div>
                    <div class="box-body no-padding">
                        <div id="log_editor" style="height: 650px; width: 100%;">{{ $content }}</div>
                    </div>
                </div>
            </div>
        </div>
    @endif
@endsection

@section('footer-scripts')
    @parent
    {!! Theme::js('vendor/ace/ace.js') !!}
    {!! Theme::js('vendor/ace/ext-searchbox.js') !!}
    <script>
    $(document).ready(function () {
        $('#select-log-file').select2().on('change', function () {
            $('#log-file-form').submit();
        });

        if (document.getElementById('log_editor') && window.ace) {
            ace.define("ace/theme/aquadactyl", ["require", "exports", "module", "ace/lib/dom"], function(e, t, n) {
                t.isDark = true;
                t.cssClass = "ace-aquadactyl";
                t.cssText = `
                    .ace-aquadactyl .ace_gutter { background: var(--aqua-surface, #1c232a); color: #73808c; border-right: 1px solid var(--aqua-border, #303942); }
                    .ace-aquadactyl .ace_print-margin { width: 0; display: none; }
                    .ace-aquadactyl { background-color: var(--aqua-chrome, #11161b); color: var(--aqua-text, #d7dce1); font-family: 'Source Code Pro', Monaco, Menlo, Consolas, monospace; font-size: 12px; }
                    .ace-aquadactyl .ace_cursor { color: #f5f6f7; }
                    .ace-aquadactyl .ace_marker-layer .ace_selection { background: rgba(59, 130, 246, 0.35); }
                    .ace-aquadactyl .ace_marker-layer .ace_active-line { background: rgba(255, 255, 255, 0.04); }
                    .ace-aquadactyl .ace_gutter-active-line { background-color: rgba(255, 255, 255, 0.06); color: #fff; }
                `;
                var r = e("../lib/dom");
                r.importCssString(t.cssText, t.cssClass, false);
            });

            var editor = ace.edit('log_editor');
            editor.setTheme('ace/theme/aquadactyl');
            editor.getSession().setMode('ace/mode/plain_text');
            editor.getSession().setUseWrapMode(true);
            editor.setShowPrintMargin(false);
            editor.setReadOnly(true);
            editor.navigateFileEnd();
        }
    });
    </script>
@endsection
