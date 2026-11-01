@extends('layouts.admin')

@section('title')
    {{ $node->name }}{{ __('admin/ui.configuration_8656f7') }}
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>{{ __('admin/ui.your_daemon_configuration_file') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.nodes') }}">{{ __('admin/ui.nodes') }}</a></li>
        <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></li>
        <li class="active">{{ __('admin/ui.configuration') }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ __('admin/ui.about') }}</a></li>
                <li><a href="{{ route('admin.nodes.view.settings', $node->id) }}">{{ __('admin/ui.settings') }}</a></li>
                <li class="active"><a href="{{ route('admin.nodes.view.configuration', $node->id) }}">{{ __('admin/ui.configuration') }}</a></li>
                <li><a href="{{ route('admin.nodes.view.allocation', $node->id) }}">{{ __('admin/ui.allocation') }}</a></li>
                <li><a href="{{ route('admin.nodes.view.servers', $node->id) }}">{{ __('admin/ui.servers') }}</a></li>
            </ul>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-sm-8">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.configuration_file') }}</h3>
                <div class="box-tools">
                    <button type="button" id="copyConfigBtn" class="btn btn-sm btn-default" title="{{ __('admin/custom.copy') }}">
                        <i class="fa fa-copy"></i> <span id="copyConfigText">{{ __('admin/custom.copy') }}</span>
                    </button>
                </div>
            </div>
            <div class="box-body">
                <pre id="configYaml" data-sensitive tabindex="0" class="no-margin">{{ $node->getYamlConfiguration() }}</pre>
            </div>
            <div class="box-footer">
                <p class="no-margin">{!! __('admin/ui.this_file_should_be_placed_in_your_daemon_s_root_directory_usually_etc_pterodactyl_in') !!}</p>
            </div>
        </div>
    </div>
    <div class="col-sm-4">
        <div class="box box-success">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.auto_deploy') }}</h3>
            </div>
            <div class="box-body">
                <p class="text-muted small">
                    {{ __('admin/ui.use_the_button_below_to_generate_a_custom_deployment_command_that_can_be_used_to_conf') }}
                </p>
            </div>
            <div class="box-footer">
                <button type="button" id="configTokenBtn" class="btn btn-sm btn-default" style="width:100%;">{{ __('admin/ui.generate_token') }}</button>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    $('#copyConfigBtn').on('click', function () {
        var text = $('#configYaml').text();
        var $btn = $(this);
        var $icon = $btn.find('i');
        var $text = $('#copyConfigText');
        var originalText = $text.text();

        function showCopied() {
            $text.text(@json(__('admin/custom.copied')));
            $icon.removeClass('fa-copy').addClass('fa-check text-success');
            setTimeout(function () {
                $text.text(originalText);
                $icon.removeClass('fa-check text-success').addClass('fa-copy');
            }, 2000);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(showCopied);
        } else {
            var $temp = $('<textarea>');
            $('body').append($temp);
            $temp.val(text).select();
            document.execCommand('copy');
            $temp.remove();
            showCopied();
        }
    });

    $('#configTokenBtn').on('click', function (event) {
        $.ajax({
            method: 'POST',
            url: '{{ route('admin.nodes.view.configuration.token', $node->id) }}',
            headers: { 'X-CSRF-TOKEN': '{{ csrf_token() }}' },
        }).done(function (data) {
            var command = 'cd /etc/pterodactyl && sudo wings configure --panel-url ' + {{ \Illuminate\Support\Js::from(config('app.url')) }} + ' --token ' + data.token + ' --node ' + data.node + {{ \Illuminate\Support\Js::from(config('app.debug') ? ' --allow-insecure' : '') }};
            var commandBlock = $('<pre>').attr({ 'data-sensitive': '', tabindex: '0' }).css({ whiteSpace: 'pre-wrap', wordBreak: 'break-all', textAlign: 'left', marginTop: '10px' }).text(command);
            swal({
                type: 'success',
                title: @json(__('admin/ui.token_created')),
                html: $('<div>').append($('<p>').text('To auto-configure your node run the following command:'), commandBlock)[0]
            });
        }).fail(function () {
            swal({
                title: @json(__('admin/ui.error')),
                text: @json(__('admin/ui.something_went_wrong_creating_your_token')),
                type: 'error'
            });
        });
    });
    </script>
@endsection
