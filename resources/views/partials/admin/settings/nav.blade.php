@include('partials/admin.settings.notice')

@section('settings::nav')
    @yield('settings::notice')
    <div class="row">
        <div class="col-xs-12">
            <div class="nav-tabs-custom nav-tabs-floating">
                <ul class="nav nav-tabs">
                    <li @if($activeTab === 'basic')class="active"@endif><a href="{{ route('admin.settings', [], false) }}">{{ __('admin/ui.general') }}</a></li>
                    <li @if($activeTab === 'mail')class="active"@endif><a href="{{ route('admin.settings.mail', [], false) }}">{{ __('admin/ui.mail') }}</a></li>
                    <li @if($activeTab === 'appearance')class="active"@endif><a href="{{ route('admin.settings.appearance', [], false) }}">{{ __('admin/custom.appearance') }}</a></li>
                    <li @if($activeTab === 'advanced')class="active"@endif><a href="{{ route('admin.settings.advanced', [], false) }}">{{ __('admin/ui.advanced_9f088d') }}</a></li>
                    <li @if($activeTab === 'oauth')class="active"@endif><a href="{{ route('admin.settings.oauth', [], false) }}">OAuth</a></li>
                    <li @if($activeTab === 'status')class="active"@endif><a href="{{ route('admin.settings.status', [], false) }}">{{ __('integrations.status.heading') }}</a></li>
                    <li @if($activeTab === 'discord')class="active"@endif><a href="{{ route('admin.settings.discord', [], false) }}">{{ __('integrations.discord.heading') }}</a></li>
                    <li @if($activeTab === 'logs')class="active"@endif><a href="{{ route('admin.settings.logs', [], false) }}">{{ __('admin/custom.logs') }}</a></li>
                </ul>
            </div>
        </div>
    </div>
@endsection
