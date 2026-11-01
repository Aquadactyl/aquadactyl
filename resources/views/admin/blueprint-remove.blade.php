@extends('layouts.admin')
@section('title', __('admin/operations.remove_extension'))
@section('content-header')
    <h1>{{ __('admin/operations.remove_extension') }}</h1>
    <ol class="breadcrumb"><li><a href="/admin/extensions">{{ __('admin/ui.extensions') }}</a></li><li class="active">{{ __('admin/operations.remove_extension') }}</li></ol>
@endsection
@section('content')
    <div class="box box-danger">
        <div class="box-header with-border"><h3 class="box-title">{{ __('admin/operations.remove_extension') }} <code>{{ $identifier }}</code></h3></div>
        <div class="box-body">
            <p>{{ __('admin/operations.remove_extension_help') }}</p>
            <div class="alert alert-warning"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i> {{ __('admin/operations.remove_extension_warning') }}</div>
            @if(!$enabled || !$workerReady)
                <div class="alert alert-warning">{{ __('admin/operations.worker_unavailable') }}</div>
                <p>{{ __('admin/operations.worker_setup') }} <code>php artisan p:blueprint:work</code></p>
                <a class="btn btn-default" href="/admin/extensions">{{ __('admin/ui.cancel') }}</a>
            @else
                <form method="POST" action="{{ route('admin.extensions.remove', ['identifier' => $identifier], false) }}">
                    @csrf
                    <div class="form-group">
                        <label for="remove-password">{{ __('admin/operations.current_password') }}</label>
                        <input class="form-control" id="remove-password" name="current_password" type="password" autocomplete="current-password" required>
                    </div>
                    <div class="checkbox checkbox-danger">
                        <input id="blueprint-confirm-removal" type="checkbox" name="confirm_removal" value="1" required>
                        <label for="blueprint-confirm-removal">{{ __('admin/operations.confirm_removal', ['identifier' => $identifier]) }}</label>
                    </div>
                    <div class="blueprint-removal-actions">
                        <a class="btn btn-default" href="/admin/extensions">{{ __('admin/ui.cancel') }}</a>
                        <button class="btn btn-danger" type="submit"><i class="fa fa-trash-o" aria-hidden="true"></i> {{ __('admin/operations.queue_removal') }}</button>
                    </div>
                </form>
            @endif
        </div>
    </div>
@endsection
