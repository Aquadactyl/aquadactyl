@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'mail'])

@section('title', __('admin/ui.mail_settings'))
@section('content-header')
    <h1>{{ __('admin/ui.mail_settings') }}<small>{{ __('admin/ui.configure_how_aquadactyl_should_handle_sending_emails') }}</small></h1>
    <ol class="breadcrumb"><li><a href="{{ route('admin.index', [], false) }}">{{ __('admin/ui.admin') }}</a></li><li class="active">{{ __('admin/ui.settings') }}</li></ol>
@endsection

@section('content')
    @yield('settings::nav')
    <div class="box">
        <div class="box-header with-border"><h3 class="box-title">{{ __('admin/ui.email_settings') }}</h3></div>
        <form id="mail-settings">
            @csrf
            <fieldset @disabled($disabled)>
                <div class="box-body">
                    <div class="form-group">
                        <label for="mail-driver">{{ __('admin/custom.mail_service') }}</label>
                        <select id="mail-driver" name="mail:default" class="form-control">
                            @foreach($drivers as $id => $label)
                                <option value="{{ $id }}" @selected(old('mail:default', config('mail.default')) === $id)>{{ $label }}</option>
                            @endforeach
                            @if(!array_key_exists(config('mail.default'), $drivers))
                                <option value="{{ config('mail.default') }}" selected>{{ config('mail.default') }}</option>
                            @endif
                        </select>
                        <p class="text-muted">{{ __('admin/custom.mail_service_help') }}</p>
                    </div>
                    <fieldset data-mail-driver="smtp">
                        <div class="row">
                            <div class="form-group col-md-6"><label for="smtp-host">{{ __('admin/ui.smtp_host') }}</label><input id="smtp-host" name="mail:mailers:smtp:host" value="{{ config('mail.mailers.smtp.host') }}" class="form-control" required></div>
                            <div class="form-group col-md-2"><label for="smtp-port">{{ __('admin/ui.smtp_port') }}</label><input id="smtp-port" type="number" name="mail:mailers:smtp:port" value="{{ config('mail.mailers.smtp.port') }}" min="1" max="65535" class="form-control" required></div>
                            <div class="form-group col-md-4">
                                <label for="smtp-encryption">{{ __('admin/ui.encryption') }}</label>
                                <select id="smtp-encryption" name="mail:mailers:smtp:encryption" class="form-control">
                                    @foreach(['' => __('admin/ui.none'), 'tls' => 'STARTTLS', 'ssl' => 'TLS / SSL'] as $id => $label)
                                        <option value="{{ $id }}" @selected((config('mail.mailers.smtp.encryption') ?? '') === $id)>{{ $label }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div class="form-group col-md-6"><label for="smtp-username">{{ __('admin/ui.username') }}</label><input id="smtp-username" name="mail:mailers:smtp:username" value="{{ config('mail.mailers.smtp.username') }}" class="form-control" autocomplete="off"></div>
                            <div class="form-group col-md-6"><label for="smtp-password">{{ __('admin/ui.password') }}</label><input id="smtp-password" type="password" name="mail:mailers:smtp:password" class="form-control" autocomplete="new-password"><p class="text-muted small">{{ __('admin/custom.mail_secret_help') }}</p></div>
                        </div>
                    </fieldset>
                    <fieldset data-mail-driver="mailgun">
                        <div class="row">
                            <div class="form-group col-md-6"><label for="mailgun-domain">{{ __('admin/custom.mailgun_domain') }}</label><input id="mailgun-domain" name="services:mailgun:domain" value="{{ config('services.mailgun.domain') }}" class="form-control" required></div>
                            <div class="form-group col-md-6"><label for="mailgun-endpoint">{{ __('admin/custom.mailgun_region') }}</label><select id="mailgun-endpoint" name="services:mailgun:endpoint" class="form-control"><option value="api.mailgun.net" @selected(config('services.mailgun.endpoint') === 'api.mailgun.net')>{{ __('admin/custom.region_us') }}</option><option value="api.eu.mailgun.net" @selected(config('services.mailgun.endpoint') === 'api.eu.mailgun.net')>{{ __('admin/custom.region_eu') }}</option></select></div>
                            <div class="form-group col-xs-12"><label for="mailgun-secret">{{ __('admin/custom.api_key') }}</label><input id="mailgun-secret" type="password" name="services:mailgun:secret" class="form-control" autocomplete="new-password"><p class="text-muted small">{{ __('admin/custom.mail_secret_help') }}</p></div>
                        </div>
                    </fieldset>
                    <fieldset data-mail-driver="postmark">
                        <div class="row">
                            <div class="form-group col-md-6"><label for="postmark-token">{{ __('admin/custom.postmark_token') }}</label><input id="postmark-token" type="password" name="services:postmark:token" class="form-control" autocomplete="new-password"><p class="text-muted small">{{ __('admin/custom.mail_secret_help') }}</p></div>
                            <div class="form-group col-md-6"><label for="postmark-stream">{{ __('admin/custom.postmark_stream') }}</label><input id="postmark-stream" name="mail:mailers:postmark:message_stream_id" value="{{ config('mail.mailers.postmark.message_stream_id') ?: 'outbound' }}" class="form-control" required></div>
                        </div>
                    </fieldset>
                    <fieldset data-mail-driver="ses">
                        <div class="row">
                            <div class="form-group col-md-6"><label for="ses-key">{{ __('admin/custom.ses_key') }}</label><input id="ses-key" type="password" name="services:ses:key" class="form-control" autocomplete="new-password"><p class="text-muted small">{{ __('admin/custom.mail_secret_help') }}</p></div>
                            <div class="form-group col-md-6"><label for="ses-secret">{{ __('admin/custom.ses_secret') }}</label><input id="ses-secret" type="password" name="services:ses:secret" class="form-control" autocomplete="new-password"><p class="text-muted small">{{ __('admin/custom.mail_secret_help') }}</p></div>
                            <div class="form-group col-md-6"><label for="ses-region">{{ __('admin/custom.ses_region') }}</label><input id="ses-region" name="services:ses:region" value="{{ config('services.ses.region') }}" class="form-control" required></div>
                        </div>
                    </fieldset>
                    <p class="text-muted" data-mail-driver="log">{{ __('admin/custom.mail_log_help') }}</p>
                    <div class="row">
                        <div class="form-group col-md-6"><label for="mail-from">{{ __('admin/ui.mail_from') }}</label><input id="mail-from" type="email" name="mail:from:address" value="{{ config('mail.from.address') }}" class="form-control" required><p class="text-muted small">{{ __('admin/custom.mail_sender_help') }}</p></div>
                        <div class="form-group col-md-6"><label for="mail-from-name">{{ __('admin/ui.mail_from_name') }}</label><input id="mail-from-name" name="mail:from:name" value="{{ config('mail.from.name') }}" class="form-control"></div>
                    </div>
                </div>
                <div class="box-footer"><button type="button" id="testButton" class="btn btn-success btn-sm">{{ __('admin/ui.test') }}</button> <button type="submit" id="saveButton" class="btn btn-primary btn-sm">{{ __('admin/ui.save') }}</button></div>
            </fieldset>
        </form>
    </div>
@endsection

@section('footer-scripts')
    @parent
    <script>
        $(function () {
            var form = $('#mail-settings');
            var busy = false;
            function updateDriver() {
                var driver = $('#mail-driver').val();
                $('[data-mail-driver]').each(function () {
                    var active = $(this).attr('data-mail-driver') === driver;
                    $(this).toggle(active);
                    if (this.tagName === 'FIELDSET') this.disabled = !active;
                });
            }
            $('#mail-driver').on('change', updateDriver);
            updateDriver();
            function showError(response) {
                var data = response.responseJSON || {};
                var errors = data.errors || {};
                var message = data.error || data.message || @json(__('admin/custom.mail_save_failed'));
                if (Object.keys(errors).length) message = Object.values(errors).flat().map(function (error) { return typeof error === 'string' ? error : error.detail; }).join(' ');
                swal({ title: @json(__('admin/ui.whoops')), text: message, type: 'error' });
            }
            function save(test) {
                if (busy || !form[0].reportValidity()) return;
                busy = true;
                $('#saveButton, #testButton').prop('disabled', true);
                var payload = {};
                form.serializeArray().forEach(function (field) { if (field.name !== '_token') payload[field.name] = field.value; });
                $.ajax({method:'PATCH',url:@json(route('admin.settings.mail', [], false)),contentType:'application/json',data:JSON.stringify(payload),headers:{'X-CSRF-Token':form.find('[name="_token"]').val()}})
                    .then(function () {
                        form.find('input[type="password"]').val('');
                        if (test) return $.ajax({method:'POST',url:@json(route('admin.settings.mail.test', [], false)),headers:{'X-CSRF-Token':form.find('[name="_token"]').val()}});
                    })
                    .done(function () { swal({title:@json(__('admin/ui.success')),text:test ? @json(__('admin/ui.the_test_message_was_sent_successfully')) : @json(__('admin/ui.mail_settings_have_been_updated_successfully_and_the_queue_worker_was_restarted_to_ap')),type:'success'}); })
                    .fail(showError)
                    .always(function () { busy = false; $('#saveButton, #testButton').prop('disabled', false); });
            }
            form.on('submit',function (event) { event.preventDefault(); save(false); });
            $('#testButton').on('click',function () { save(true); });
        });
    </script>
@endsection
