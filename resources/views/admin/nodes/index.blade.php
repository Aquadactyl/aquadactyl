@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.list_nodes') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.nodes') }}<small>{{ __('admin/ui.all_nodes_available_on_the_system') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/ui.nodes') }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.node_list') }}</h3>
                <div class="box-tools search01">
                    <form action="{{ route('admin.nodes') }}" method="GET">
                        <div class="input-group input-group-sm">
                            <input type="text" name="filter[name]" class="form-control pull-right" value="{{ request()->input('filter.name') }}" placeholder="{{ __('admin/ui.search_nodes') }}">
                            <div class="input-group-btn">
                                <button type="submit" class="btn btn-default" aria-label="{{ __('admin/ui.search_nodes_667f0b') }}"><i class="fa fa-search" aria-hidden="true"></i></button>
                                <a href="{{ route('admin.nodes.new') }}" class="btn btn-sm btn-primary">{{ __('admin/ui.create_new') }}</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th></th>
                            <th>ID</th>
                            <th>{{ __('admin/ui.name') }}</th>
                            <th>{{ __('admin/ui.location') }}</th>
                            <th>{{ __('admin/ui.memory') }}</th>
                            <th>{{ __('admin/ui.disk') }}</th>
                            <th class="text-center">{{ __('admin/ui.servers') }}</th>
                            <th class="text-center">SSL</th>
                            <th class="text-center">{{ __('admin/ui.public') }}</th>
                        </tr>
                        @foreach ($nodes as $node)
                            <tr>
                                <td class="text-center text-muted left-icon" data-action="ping" data-secret="{{ $node->getDecryptedKey() }}" data-location="{{ $node->scheme }}://{{ $node->fqdn }}:{{ $node->daemonListen }}/api/system"><i class="fa fa-fw fa-refresh fa-spin"></i></td>
                                <td><code>{{ $node->id }}</code></td>
                                <td>{!! $node->maintenance_mode ? '<span class="label label-warning"><i class="fa fa-wrench"></i></span> ' : '' !!}<a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></td>
                                <td>
                                    @if($node->country_code)
                                        <img src="/flags/{{ strtolower($node->country_code) }}.svg" alt="{{ \Pterodactyl\Support\Countries::name($node->country_code) }}" title="{{ \Pterodactyl\Support\Countries::name($node->country_code) }}" width="20" height="15" style="margin-right:6px;vertical-align:middle;" />
                                    @endif
                                    {{ $node->location->short }}
                                </td>
                                <td>{{ $node->memory }} MiB</td>
                                <td>{{ $node->disk }} MiB</td>
                                <td class="text-center">{{ $node->servers_count }}</td>
                                <td class="text-center" style="color:{{ ($node->scheme === 'https') ? '#50af51' : '#d9534f' }}"><i class="fa fa-{{ ($node->scheme === 'https') ? 'lock' : 'unlock' }}"></i></td>
                                <td class="text-center"><i class="fa fa-{{ ($node->public) ? 'eye' : 'eye-slash' }}"></i></td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if($nodes->hasPages())
                <div class="box-footer with-border">
                    <div class="col-md-12 text-center">{!! $nodes->appends(['query' => Request::input('query')])->render() !!}</div>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    (function pingNodes() {
        $('td[data-action="ping"]').each(function(i, element) {
            $.ajax({
                type: 'GET',
                url: $(element).data('location'),
                headers: {
                    'Authorization': 'Bearer ' + $(element).data('secret'),
                },
                timeout: 5000
            }).done(function (data) {
                $(element).find('i').tooltip({
                    title: data.version,
                });
                $(element).removeClass('text-muted').find('i').removeClass().addClass('fa fa-fw fa-heartbeat faa-pulse animated').css('color', '#50af51');
            }).fail(function (error) {
                var errorText = @json(__('admin/ui.node_connection_error'));
                try {
                    errorText = error.responseJSON.errors[0].detail || errorText;
                } catch (ex) {}

                $(element).removeClass('text-muted').find('i').removeClass().addClass('fa fa-fw fa-heart-o').css('color', '#d9534f');
                $(element).find('i').tooltip({ title: errorText });
            });
        }).promise().done(function () {
            setTimeout(pingNodes, 10000);
        });
    })();
    </script>
@endsection
