@extends('layouts.admin')

@section('title')
    {{ $node->name }}{{ __('admin/ui.servers_0b0b7b') }}
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>{{ __('admin/ui.all_servers_currently_assigned_to_this_node') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.nodes') }}">{{ __('admin/ui.nodes') }}</a></li>
        <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></li>
        <li class="active">{{ __('admin/ui.servers') }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ __('admin/ui.about') }}</a></li>
                <li><a href="{{ route('admin.nodes.view.settings', $node->id) }}">{{ __('admin/ui.settings') }}</a></li>
                <li><a href="{{ route('admin.nodes.view.configuration', $node->id) }}">{{ __('admin/ui.configuration') }}</a></li>
                <li><a href="{{ route('admin.nodes.view.allocation', $node->id) }}">{{ __('admin/ui.allocation') }}</a></li>
                <li class="active"><a href="{{ route('admin.nodes.view.servers', $node->id) }}">{{ __('admin/ui.servers') }}</a></li>
            </ul>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-sm-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.server_list') }}</h3>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tr>
                        <th>ID</th>
                        <th>{{ __('admin/ui.server_name') }}</th>
                        <th>{{ __('admin/ui.owner') }}</th>
                        <th>{{ __('admin/ui.service') }}</th>
                    </tr>
                    @foreach($servers as $server)
                        <tr data-server="{{ $server->uuid }}">
                            <td><code>{{ $server->identifier }}</code></td>
                            <td><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></td>
                            <td><a href="{{ route('admin.users.view', $server->owner_id) }}">{{ $server->user->username }}</a></td>
                            <td>{{ $server->nest->name }} ({{ $server->egg->name }})</td>
                        </tr>
                    @endforeach
                </table>
                @if($servers->hasPages())
                    <div class="box-footer with-border">
                        <div class="col-md-12 text-center">{!! $servers->render() !!}</div>
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
