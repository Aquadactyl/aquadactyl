@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.list_servers') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.servers') }}<small>{{ __('admin/ui.all_servers_available_on_the_system') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/ui.servers') }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.server_list') }}</h3>
                <div class="box-tools search01">
                    <form action="{{ route('admin.servers') }}" method="GET">
                        <div class="input-group input-group-sm">
                            <input type="text" name="filter[*]" class="form-control pull-right" value="{{ request()->input()['filter']['*'] ?? '' }}" placeholder="{{ __('admin/ui.search_servers') }}">
                            <div class="input-group-btn">
                                <button type="submit" class="btn btn-default" aria-label="{{ __('admin/ui.search_servers_3d7d70') }}"><i class="fa fa-search" aria-hidden="true"></i></button>
                                <a href="{{ route('admin.servers.new') }}" class="btn btn-sm btn-primary">{{ __('admin/ui.create_new') }}</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <div class="box-body table-responsive no-padding" tabindex="0" role="region" aria-label="{{ __('admin/ui.server_list') }}">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>{{ __('admin/ui.server_name') }}</th>
                            <th>{{ __('admin/ui.uuid') }}</th>
                            <th>{{ __('admin/ui.owner') }}</th>
                            <th>{{ __('admin/ui.node') }}</th>
                            <th>{{ __('admin/ui.connection') }}</th>
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($servers as $server)
                            <tr data-server="{{ $server->identifier }}">
                                <td><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></td>
                                <td><code title="{{ $server->uuid }}">{{ $server->uuid }}</code></td>
                                <td><a href="{{ route('admin.users.view', $server->user->id) }}">{{ $server->user->username }}</a></td>
                                <td><a href="{{ route('admin.nodes.view', $server->node->id) }}">{{ $server->node->name }}</a></td>
                                <td>
                                    <code data-sensitive tabindex="0">{{ $server->allocation->alias }}:{{ $server->allocation->port }}</code>
                                </td>
                                <td class="text-center">
                                    @if($server->isSuspended())
                                        <span class="label bg-maroon">{{ __('admin/ui.suspended') }}</span>
                                    @elseif(! $server->isInstalled())
                                        <span class="label label-warning">{{ __('admin/ui.installing') }}</span>
                                    @else
                                        <span class="label label-success">{{ __('admin/ui.active') }}</span>
                                    @endif
                                </td>
                                <td class="text-center">
                                    <a class="btn btn-xs btn-default" href="/server/{{ $server->identifier }}"><i class="fa fa-wrench"></i></a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if($servers->hasPages())
                <div class="box-footer with-border">
                    <div class="col-md-12 text-center">{!! $servers->appends(['filter' => Request::input('filter')])->render() !!}</div>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
        $('.console-popout').on('click', function (event) {
            event.preventDefault();
            window.open($(this).attr('href'), 'Aquadactyl Console', 'width=800,height=400');
        });
    </script>
@endsection
