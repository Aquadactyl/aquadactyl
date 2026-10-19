@extends('layouts.admin')
@section('title', __('admin/operations.daemon_stats'))
@section('content-header')
    <h1>{{ __('admin/operations.daemon_stats') }}<small>{{ __('admin/operations.daemon_help') }}</small></h1>
@endsection
@section('content')
    <p class="text-muted">{{ __('admin/operations.usage_explanation') }}</p>
    <div class="daemon-grid">
        @forelse($nodes as $node)
            <section class="box box-default daemon-card" data-daemon-url="{{ route('admin.daemon-stats.status', ['node' => $node->id], false) }}" data-memory-total="{{ $node->memory * 1048576 }}" data-disk-total="{{ $node->disk * 1048576 }}">
                <div class="box-header with-border"><h3 class="box-title"><a href="{{ route('admin.nodes.view', ['node' => $node->id], false) }}">{{ $node->name }}</a></h3><span class="label label-default" data-field="status">{{ __('admin/operations.checking') }}</span></div>
                <div class="box-body">
                    <p class="text-muted daemon-location">{{ $node->location->short }} &middot; {{ trans_choice('admin/operations.servers', $node->servers_count, ['count' => $node->servers_count]) }} <span data-field="running"></span></p>
                    @foreach(['server' => 'server_usage', 'assigned' => 'assignment_capacity', 'host' => 'host_usage'] as $section => $title)
                        <div class="daemon-metrics" data-section="{{ $section }}">
                            <h4>{{ __('admin/operations.' . $title) }}</h4>
                            @if($section === 'host')<p class="text-muted daemon-note" data-host-note>{{ __('admin/operations.checking') }}</p>@endif
                            @foreach(['memory' => 'memory', 'cpu' => 'cpu', 'disk' => 'disk'] as $resource => $label)
                                <div class="daemon-metric" data-metric="{{ $section }}-{{ $resource }}">
                                    <div class="daemon-metric-heading"><span>{{ __('admin/operations.metric_' . $label) }}</span><strong data-value>&mdash;</strong></div>
                                    <div class="progress daemon-progress" role="meter" aria-label="{{ __('admin/operations.' . $title) }}: {{ __('admin/operations.metric_' . $label) }}" aria-valuemin="0" aria-valuemax="100" hidden><div class="progress-bar" style="width:0%"></div></div>
                                    <p class="text-muted daemon-note" data-meta></p>
                                </div>
                            @endforeach
                            @if($section === 'server')<p class="text-muted daemon-note" data-field="network"></p>@endif
                        </div>
                    @endforeach
                    <details class="daemon-system"><summary>{{ __('admin/operations.system_details') }}</summary><dl>
                        <dt>{{ __('admin/operations.daemon_version') }}</dt><dd data-field="version">&mdash;</dd>
                        <dt>{{ __('admin/operations.operating_system') }}</dt><dd data-field="os">&mdash;</dd>
                        <dt>{{ __('admin/operations.cpu_threads') }}</dt><dd data-field="cpu">&mdash;</dd>
                        <dt>{{ __('admin/operations.total_memory') }}</dt><dd data-field="memory">&mdash;</dd>
                        <dt>Docker</dt><dd data-field="docker">&mdash;</dd>
                        <dt>{{ __('admin/operations.checked') }}</dt><dd data-field="checked">&mdash;</dd>
                    </dl></details>
                </div>
            </section>
        @empty
            <p>{{ __('admin/operations.no_nodes') }}</p>
        @endforelse
    </div>
    {{ $nodes->links() }}
@endsection
@section('footer-scripts')
    @parent
    @php
        $metricLabels = [];
        foreach (['connected', 'unreachable', 'not_reported', 'available', 'assigned', 'unlimited', 'unlimited_limits', 'overassigned', 'host_unavailable', 'cpu_threads', 'running', 'received', 'sent', 'used'] as $label) {
            $metricLabels[$label] = __('admin/operations.' . $label);
        }
    @endphp
    <style>
    .daemon-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:20px;align-items:start}
    .daemon-card{min-width:0;margin:0}.daemon-card .box-header{display:flex;align-items:center;justify-content:space-between;gap:12px}.daemon-card .box-title{overflow-wrap:anywhere;min-width:0}.daemon-card .box-header .label{flex-shrink:0}
    .daemon-location{margin-bottom:18px}.daemon-metrics{border-top:1px solid var(--aqua-border,#303942);padding-top:14px;margin-top:16px}.daemon-metrics h4{font-size:13px;font-weight:600;margin:0 0 14px;color:var(--aqua-text,#d7dce1)}
    .daemon-metric{margin-bottom:13px}.daemon-metric-heading{display:flex;justify-content:space-between;align-items:baseline;gap:12px;line-height:1.5}.daemon-metric-heading strong{font-size:13px;text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;min-width:0}
    .daemon-progress{height:5px;margin:6px 0;border-radius:4px;background:var(--aqua-chrome,#11161b)}.daemon-progress[hidden]{display:none}.daemon-progress .progress-bar{background:var(--aqua-primary,#7c78ff);transition:width .2s ease}.daemon-progress.is-over .progress-bar{background:#e6a23c}
    .daemon-note{font-size:12px;line-height:1.5;margin:4px 0 0;overflow-wrap:anywhere}.daemon-system{border-top:1px solid var(--aqua-border,#303942);padding-top:12px;margin-top:16px}.daemon-system summary{cursor:pointer;font-size:13px}.daemon-system dl{display:grid;grid-template-columns:minmax(90px,1fr) minmax(0,1.5fr);gap:7px 12px;margin:12px 0 0;font-size:12px}.daemon-system dt,.daemon-system dd{margin:0;overflow-wrap:anywhere;white-space:normal}
    @media(prefers-reduced-motion:reduce){.daemon-progress .progress-bar{transition:none}}
    </style>
    <script>
    (function () {
        const cards = Array.from(document.querySelectorAll('[data-daemon-url]'));
        const labels = @json($metricLabels);
        const number = new Intl.NumberFormat(document.documentElement.lang, { maximumFractionDigits: 2 });
        const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
        const bytes = value => {
            if (!valid(value)) return labels.not_reported;
            const units = ['B','KiB','MiB','GiB','TiB']; let i = 0;
            while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
            return number.format(value) + ' ' + units[i];
        };
        function render(card, data) {
            const set = (key, value) => { card.querySelector('[data-field="' + key + '"]').textContent = value; };
            function metric(key, used, total, format, note) {
                const row = card.querySelector('[data-metric="' + key + '"]');
                const percent = valid(used) && valid(total) && total > 0 ? used / total * 100 : null;
                row.querySelector('[data-value]').textContent = format(used) + ' / ' + format(total);
                row.querySelector('[data-meta]').textContent = note || (percent === null ? '' : number.format(percent) + '% ' + labels.used);
                const meter = row.querySelector('[role="meter"]'); meter.hidden = percent === null;
                meter.setAttribute('aria-valuenow', percent === null ? '0' : String(Math.min(100, percent)));
                meter.setAttribute('aria-valuetext', row.querySelector('[data-value]').textContent);
                meter.classList.toggle('is-over', percent > 100);
                meter.firstElementChild.style.width = percent === null ? '0%' : Math.min(100, percent) + '%';
            }
            const threads = value => valid(value) ? number.format(value) + ' ' + labels.cpu_threads.toLowerCase() : labels.not_reported;
            set('status', data.online ? labels.connected : labels.unreachable);
            card.querySelector('[data-field="status"]').className = 'label label-' + (data.online ? 'success' : 'danger');
            set('checked', data.checked_at ? new Date(data.checked_at).toLocaleTimeString() : labels.not_reported);
            set('version', data.version || labels.not_reported);
            set('os', data.system ? data.system.type + ' / ' + data.system.arch : labels.not_reported);
            set('cpu', data.system?.cpus || labels.not_reported);
            set('memory', data.system?.memory_bytes ? bytes(data.system.memory_bytes) : labels.not_reported);
            set('docker', data.docker?.version || labels.not_reported);
            const usage = data.usage;
            set('running', usage ? '\u00b7 ' + usage.running_servers + ' ' + labels.running : '');
            metric('server-memory', usage?.memory_bytes, Number(card.dataset.memoryTotal), bytes);
            metric('server-cpu', usage?.cpu_threads, data.system?.cpus || null, threads);
            metric('server-disk', usage?.disk_bytes, Number(card.dataset.diskTotal), bytes);
            set('network', usage ? labels.received + ': ' + bytes(usage.network_rx_bytes) + ' \u00b7 ' + labels.sent + ': ' + bytes(usage.network_tx_bytes) : '');
            for (const resource of ['memory','cpu','disk']) {
                const capacity = data.capacity?.[resource]; const format = resource === 'cpu' ? threads : bytes;
                const unlimited = capacity?.total === null && resource !== 'cpu';
                const totalFormat = value => value === null && unlimited ? labels.unlimited : format(value);
                let note = labels.available + ': ' + totalFormat(capacity?.available);
                if (capacity?.unlimited_servers) note += ' \u00b7 ' + labels.unlimited_limits.replace(':count', capacity.unlimited_servers);
                if (capacity?.overallocated > 0) note += ' \u00b7 ' + labels.overassigned + ': ' + format(capacity.overallocated);
                metric('assigned-' + resource, capacity?.assigned, capacity?.total, totalFormat, note);
            }
            const host = data.host_usage;
            const reported = host && Object.values(host).some(valid);
            card.querySelector('[data-host-note]').textContent = reported ? '' : labels.host_unavailable;
            card.querySelectorAll('[data-metric^="host-"]').forEach(row => { row.hidden = !reported; });
            if (reported) {
                metric('host-memory', host.memory_used_bytes, host.memory_total_bytes, bytes);
                metric('host-cpu', host.cpu_percent, 100, value => valid(value) ? number.format(value) + '%' : labels.not_reported);
                metric('host-disk', host.disk_used_bytes, host.disk_total_bytes, bytes);
            }
        }
        async function refresh(card) {
            try {
                const response = await fetch(card.dataset.daemonUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(9000) });
                if (!response.ok) throw new Error('Unavailable');
                render(card, await response.json());
            } catch (_) {
                // Clear old measurements so a failed refresh never looks like live data.
                render(card, { online: false });
            }
        }
        let busy = false;
        async function tick() {
            if (document.hidden || busy) return;
            busy = true;
            try { for (let i = 0; i < cards.length; i += 3) await Promise.all(cards.slice(i, i + 3).map(refresh)); }
            finally { busy = false; }
        }
        tick(); const timer = setInterval(tick, 30000);
        document.addEventListener('visibilitychange', tick);
        window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
    })();
    </script>
@endsection
