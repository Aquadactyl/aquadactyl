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
                        <div style="padding:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><a class="btn btn-default btn-sm" href="{{ route('admin.settings.logs.download', ['file' => $currentFile['name']], false) }}">{{ __('admin/operations.download_log') }}</a><label style="margin:0"><input type="checkbox" id="log-wrap" checked> {{ __('admin/operations.wrap_lines') }}</label>@if($truncated)<span class="text-muted">{{ __('admin/operations.log_tail') }}</span>@endif</div><pre id="log_editor" tabindex="0" style="margin:0;max-height:65vh;min-height:250px;overflow:auto;padding:16px;border:0;border-radius:0;background:var(--aqua-chrome,#11161b);color:var(--aqua-text,#d7dce1);font:12px/1.65 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere">{{ $content }}</pre>
                    </div>
                </div>
            </div>
        </div>
    @endif
@endsection

@section('footer-scripts')
    @parent
    <script>
    $(function () {
        $('#select-log-file').select2().on('change', function () { $('#log-file-form').submit(); });
        const log = document.getElementById('log_editor');
        const wrap = document.getElementById('log-wrap');
        if (log) log.scrollTop = log.scrollHeight;
        if (wrap) wrap.addEventListener('change', function () { log.style.whiteSpace = this.checked ? 'pre-wrap' : 'pre'; log.style.overflowWrap = this.checked ? 'anywhere' : 'normal'; });
    });
    </script>
@endsection
