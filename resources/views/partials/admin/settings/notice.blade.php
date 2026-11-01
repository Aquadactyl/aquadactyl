@section('settings::notice')
    @if(config('pterodactyl.load_environment_only', false) && ($activeTab ?? '') !== 'oauth')
        <div class="row">
            <div class="col-xs-12">
                <div class="alert alert-danger">
                    {{ __('admin/ui.your_panel_is_currently_configured_to_read_settings_from_the_environment_only_you_wil') }} <code>APP_ENVIRONMENT_ONLY=false</code> {{ __('admin/ui.in_your_environment_file_in_order_to_load_settings_dynamically') }}
                </div>
            </div>
        </div>
    @endif
@endsection
