@extends('layouts.admin')
@section('title', __('admin/operations.install_blueprint'))
@section('content-header')
    <h1>{{ __('admin/operations.install_blueprint') }}</h1>
    <ol class="breadcrumb"><li><a href="/admin/extensions">{{ __('admin/ui.extensions') }}</a></li><li class="active">{{ __('admin/operations.install_blueprint') }}</li></ol>
@endsection
@section('content')
    <div class="box box-primary">
        <div class="box-header with-border"><h3 class="box-title">{{ __('admin/operations.upload_package') }}</h3></div>
        <div class="box-body">
            <p>{{ __('admin/operations.blueprint_help') }}</p>
            @if(!$enabled || !$workerReady)
                <div class="alert alert-warning">{{ __('admin/operations.worker_unavailable') }}</div>
                <p>{{ __('admin/operations.worker_setup') }} <code>php artisan p:blueprint:work</code></p>
            @else
                <form method="POST" action="/admin/extensions/install" enctype="multipart/form-data">
                    @csrf
                    <div class="row"><div class="form-group col-md-6"><label for="blueprint-package">{{ __('admin/operations.package') }} (.blueprint, 50 MiB)</label><input class="form-control" id="blueprint-package" name="package" type="file" accept=".blueprint,.zip" required></div>
                    <div class="form-group col-md-6"><label for="install-password">{{ __('admin/operations.current_password') }}</label><input class="form-control" id="install-password" name="current_password" type="password" autocomplete="current-password" required></div></div>
                    <div class="checkbox checkbox-primary">
                        <input id="blueprint-trusted" type="checkbox" name="trusted" value="1" required>
                        <label for="blueprint-trusted">{{ __('admin/operations.trust_package') }}</label>
                    </div>
                    <div class="checkbox checkbox-primary">
                        <input id="blueprint-allow-update" type="checkbox" name="allow_update" value="1">
                        <label for="blueprint-allow-update">{{ __('admin/operations.allow_update') }}</label>
                    </div>
                    <button class="btn btn-primary" type="submit">{{ __('admin/operations.queue_install') }}</button>
                </form>
            @endif
        </div>
    </div>
    <div class="box box-default" id="installation-history"><div class="box-header with-border"><h3 class="box-title">{{ __('admin/operations.recent_operations') }}</h3></div>
        <div class="box-body table-responsive"><table class="table table-hover"><thead><tr><th>{{ __('admin/operations.package') }}</th><th>{{ __('admin/operations.operation') }}</th><th>{{ __('admin/operations.status') }}</th><th>{{ __('admin/operations.details') }}</th></tr></thead><tbody id="installation-status">
        @foreach($installations as $installation)<tr><td><code>{{ $installation->identifier }}</code></td><td>{{ __('admin/operations.operation_' . $installation->operation) }}</td><td>{{ __('admin/operations.status_' . $installation->status . ($installation->operation === 'remove' && in_array($installation->status, ['running', 'completed']) ? '_remove' : '')) }}</td><td>{{ $installation->message }}</td></tr>@endforeach
        </tbody></table></div>
        <div class="box-footer"><a href="/admin/extensions">{{ __('admin/ui.installed_extensions') }} &rarr;</a></div>
    </div>
@endsection
@section('footer-scripts')
    @parent
    @php
        $statusLabels = [];
        foreach (['uploading', 'queued', 'running', 'completed', 'failed'] as $status) {
            $statusLabels[$status] = __('admin/operations.status_' . $status);
        }
        foreach (['running_remove', 'completed_remove'] as $status) {
            $statusLabels[$status] = __('admin/operations.status_' . $status);
        }
        $operationLabels = ['install' => __('admin/operations.operation_install'), 'remove' => __('admin/operations.operation_remove')];
    @endphp
    <script>
    (() => {
        const labels = @json($statusLabels);
        const operations = @json($operationLabels);
        let busy = false;
        const timer = setInterval(async () => {
            if (document.hidden || busy) return;
            busy = true;
            try {
                const response = await fetch('/admin/extensions/install/status', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
                if (!response.ok) return;
                const data = await response.json();
                const body = document.getElementById('installation-status'); body.replaceChildren();
                data.data.forEach(item => {
                    const row = document.createElement('tr');
                    const status = item.operation === 'remove' && ['running', 'completed'].includes(item.status) ? item.status + '_remove' : item.status;
                    [item.identifier, operations[item.operation] || item.operation, labels[status] || item.status, item.message || ''].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
                    body.append(row);
                });
            } catch (_) {} finally { busy = false; }
        }, 5000);
        window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
    })();
    </script>
@endsection
