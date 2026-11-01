<div class="modal fade" id="quickSetupModal" tabindex="-1" role="dialog" aria-labelledby="quickSetupTitle" data-wizard="{{ ($wizard ?? false) ? 'true' : 'false' }}" data-create-node="{{ $createNode ? '1' : '0' }}" data-node-title="{{ __('admin/ui.create_node') }}" data-location-title="{{ __('admin/management.create_location') }}" data-failed="{{ __('admin/management.request_failed') }}">
    <div class="modal-dialog modal-lg" role="document"><div class="modal-content">
        <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="{{ __('admin/ui.close') }}"><span aria-hidden="true">&times;</span></button>
            <h3 class="modal-title" id="quickSetupTitle">{{ $createNode ? __('admin/ui.create_node') : __('admin/management.create_location') }}</h3>
        </div>
        @if($createNode)
            <form id="quick-node-form" action="{{ route('admin.setup.nodes', [], false) }}" method="POST" data-quick-form="node">
                @csrf
                <div class="modal-body">
                    <p class="text-muted">{{ __('admin/management.quick_node_help') }}</p>
                    <div class="alert alert-danger quick-setup-error" role="alert" hidden></div>
                    <div class="row">
                        <div class="form-group col-sm-6"><label for="quick-node-name">{{ __('admin/ui.name') }}</label><input id="quick-node-name" name="name" class="form-control" maxlength="100" required></div>
                        <div class="form-group col-sm-6"><label for="quick-node-location">{{ __('admin/ui.location') }}</label><select id="quick-node-location" class="form-control quick-location-select" name="location_id" required>@foreach($locations as $location)<option value="{{ $location->id }}">{{ $location->short }}</option>@endforeach</select><button type="button" class="btn btn-link quick-create-location" data-location-panel><i class="fa fa-plus" aria-hidden="true"></i> {{ __('admin/management.create_location') }}</button></div>
                    </div>
                    <div class="row">
                        <div class="form-group col-sm-8"><label for="quick-node-fqdn">FQDN</label><input id="quick-node-fqdn" name="fqdn" class="form-control" maxlength="253" placeholder="node.example.com" required></div>
                        <div class="form-group col-sm-4"><label for="quick-node-scheme">{{ __('admin/ui.communicate_over_ssl') }}</label><select id="quick-node-scheme" name="scheme" class="form-control"><option value="https">HTTPS</option><option value="http" @disabled(request()->isSecure())>HTTP</option></select></div>
                    </div>
                    <div class="row">
                        <div class="form-group col-sm-6"><label for="quick-node-memory">{{ __('admin/ui.total_memory') }} (MiB)</label><input id="quick-node-memory" name="memory" type="number" min="1" value="8192" class="form-control" required></div>
                        <div class="form-group col-sm-6"><label for="quick-node-disk">{{ __('admin/ui.total_disk_space') }} (MiB)</label><input id="quick-node-disk" name="disk" type="number" min="1" value="51200" class="form-control" required></div>
                    </div>
                    <div class="row">
                        <div class="form-group col-sm-6"><label for="quick-node-port">{{ __('admin/ui.daemon_port') }}</label><input id="quick-node-port" name="daemonListen" type="number" min="1" max="65535" value="8080" class="form-control" required></div>
                        <div class="form-group col-sm-6"><label for="quick-node-sftp">{{ __('admin/ui.daemon_sftp_port') }}</label><input id="quick-node-sftp" name="daemonSFTP" type="number" min="1" max="65535" value="2022" class="form-control" required></div>
                    </div>
                    <h4>{{ __('admin/management.first_allocation') }}</h4>
                    <p class="text-muted small">{{ __('admin/management.first_allocation_help') }}</p>
                    <div class="row">
                        <div class="form-group col-sm-8"><label for="quick-node-ip">{{ __('admin/ui.ip_address') }}</label><input id="quick-node-ip" name="allocation_ip" class="form-control" placeholder="192.0.2.10" required></div>
                        <div class="form-group col-sm-4"><label for="quick-node-allocation-port">{{ __('admin/ui.port') }}</label><input id="quick-node-allocation-port" name="allocation_port" type="number" min="1" max="65535" value="25565" class="form-control" required></div>
                    </div>
                    <input type="hidden" name="public" value="1"><input type="hidden" name="behind_proxy" value="0"><input type="hidden" name="memory_overallocate" value="0"><input type="hidden" name="disk_overallocate" value="0">
                </div>
                <div class="modal-footer"><button class="btn btn-default" type="button" data-dismiss="modal">{{ __('admin/ui.cancel') }}</button><button class="btn btn-primary" type="submit">{{ __('admin/ui.create_node') }}</button></div>
            </form>
        @endif
        <form id="quick-location-form" action="{{ route('admin.setup.locations', [], false) }}" method="POST" data-quick-form="location" @if($createNode) hidden @endif>
            @csrf
            <div class="modal-body">
                <div class="alert alert-danger quick-setup-error" role="alert" hidden></div>
                <div class="form-group"><label for="quick-location-short">{{ __('admin/ui.short_code') }}</label><input id="quick-location-short" name="short" class="form-control" maxlength="60" placeholder="eu-london" required></div>
                <div class="form-group"><label for="quick-location-long">{{ __('admin/ui.description') }}</label><textarea id="quick-location-long" name="long" class="form-control" maxlength="191" rows="3"></textarea></div>
            </div>
            <div class="modal-footer">
                @if($createNode)<button class="btn btn-default" type="button" data-node-panel>{{ __('admin/management.back_to_node') }}</button>@else<button class="btn btn-default" type="button" data-dismiss="modal">{{ __('admin/ui.cancel') }}</button>@endif
                <button class="btn btn-primary" type="submit">{{ __('admin/management.create_location') }}</button>
            </div>
        </form>
    </div></div>
</div>
<script src="/themes/pterodactyl/js/admin/quick-setup.js?v={{ filemtime(public_path('themes/pterodactyl/js/admin/quick-setup.js')) }}" defer></script>
