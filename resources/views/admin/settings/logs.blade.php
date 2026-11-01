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
                        <div style="padding:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><a class="btn btn-default btn-sm" href="{{ route('admin.settings.logs.download', ['file' => $currentFile['name']], false) }}">{{ __('admin/operations.download_log') }}</a><label style="margin:0"><input type="checkbox" id="log-wrap" checked> {{ __('admin/operations.wrap_lines') }}</label>@if($truncated)<span class="text-muted">{{ __('admin/operations.log_tail') }}</span>@endif</div><pre id="log_editor" tabindex="0" style="margin:0;height:65vh;min-height:350px;border:0;border-radius:0;">{{ $content }}</pre>
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
    {!! Theme::js('vendor/ace/theme-tomorrow_night.js') !!}
    <script>
    $(function () {
        $('#select-log-file').select2().on('change', function () { $('#log-file-form').submit(); });
        const log = document.getElementById('log_editor');
        if (!log) return;

        const editor = ace.edit('log_editor');
        editor.setTheme('ace/theme/tomorrow_night');
        editor.getSession().setMode('ace/mode/plain_text');
        editor.setReadOnly(true);
        editor.setShowPrintMargin(false);
        editor.getSession().setUseWrapMode(true);
        editor.renderer.setShowGutter(true);
        editor.setFontSize(12);

        // Scroll to the end of the log
        const lastRow = editor.session.getLength();
        editor.gotoLine(lastRow, 0);

        const wrap = document.getElementById('log-wrap');
        if (wrap) {
            wrap.addEventListener('change', function () {
                editor.getSession().setUseWrapMode(this.checked);
            });
        }
    });
    </script>
@endsection
