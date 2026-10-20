@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.server_acb823') }} {{ $server->name }}{{ __('admin/ui.details_b57b08') }}
@endsection

@section('content-header')
    <h1>{{ $server->name }}<small>{{ __('admin/ui.edit_details_for_this_server_including_owner_and_container') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.servers') }}">{{ __('admin/ui.servers') }}</a></li>
        <li><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></li>
        <li class="active">{{ __('admin/ui.details') }}</li>
    </ol>
@endsection

@section('content')
@include('admin.servers.partials.navigation')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.base_information') }}</h3>
            </div>
            <form action="{{ route('admin.servers.view.details', $server->id) }}" method="POST">
                <div class="box-body">
                    <div class="form-group">
                        <label for="name" class="control-label">{{ __('admin/ui.server_name') }} <span class="field-required" data-label="{{ __('admin/ui.required') }}"></span></label>
                        <input type="text" name="name" value="{{ old('name', $server->name) }}" class="form-control" />
                        <p class="text-muted small">{!! __('admin/ui.character_limits_a_za_z0_9_and_space') !!}</p>
                    </div>
                    <div class="form-group">
                        <label for="external_id" class="control-label">{{ __('admin/ui.external_identifier') }}</label>
                        <input type="text" name="external_id" value="{{ old('external_id', $server->external_id) }}" class="form-control" />
                        <p class="text-muted small">{{ __('admin/ui.leave_empty_to_not_assign_an_external_identifier_for_this_server_the_external_id_shou') }}</p>
                    </div>
                    <div class="form-group">
                        <label for="pUserId" class="control-label">{{ __('admin/ui.server_owner') }} <span class="field-required" data-label="{{ __('admin/ui.required') }}"></span></label>
                        <select data-sensitive name="owner_id" class="form-control" id="pUserId">
                            <option value="{{ $server->owner_id }}" selected>{{ $server->user->email }}</option>
                        </select>
                        <p class="text-muted small">{{ __('admin/ui.you_can_change_the_owner_of_this_server_by_changing_this_field_to_an_email_matching_a') }}</p>
                    </div>
                    <div class="form-group">
                        <label for="description" class="control-label">{{ __('admin/ui.server_description') }}</label>
                        <textarea name="description" rows="3" class="form-control">{{ old('description', $server->description) }}</textarea>
                        <p class="text-muted small">{{ __('admin/ui.a_brief_description_of_this_server') }}</p>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    {!! method_field('PATCH') !!}
                    <input type="submit" class="btn btn-sm btn-primary" value="Update Details" />
                </div>
            </form>
        </div>
    </div>

    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border"><h3 class="box-title">{{ __('admin/ui.game_player_counts') }}</h3></div>
            <form action="{{ route('admin.servers.view.game-query', $server->id) }}" method="POST">
                <div class="box-body">
                    <div class="form-group">
                        <label for="pGameQuery" class="control-label">{{ __('admin/ui.game_type') }}</label>
                        <select id="pGameQuery" name="game_query_type" class="form-control">
                            <option value="auto" {{ old('game_query_type', $server->game_query_type) === 'auto' ? 'selected' : '' }}>{{ __('admin/ui.detect_from_egg') }}</option>
                            <option value="none" {{ old('game_query_type', $server->game_query_type) === 'none' ? 'selected' : '' }}>{{ __('admin/ui.disabled_not_a_game') }}</option>
                            @foreach(config('game-query.games') as $type => $name)
                                <option value="{{ $type }}" {{ old('game_query_type', $server->game_query_type) === $type ? 'selected' : '' }}>{{ $name }}</option>
                            @endforeach
                        </select>
                        <p class="text-muted small">{{ __('admin/ui.player_counts_are_queried_while_the_game_is_running_select_a_game_when_the_egg_cannot') }}</p>
                    </div>
                    <div class="form-group">
                        <label for="pGameQueryPort" class="control-label">{{ __('admin/ui.query_address_port') }}</label>
                        <select data-sensitive id="pGameQueryPort" name="game_query_allocation_id" class="form-control">
                            <option value="">{{ __('admin/ui.automatic_primary_allocation') }}</option>
                            @foreach($server->allocations as $allocation)
                                <option value="{{ $allocation->id }}" {{ (int) old('game_query_allocation_id', $server->game_query_allocation_id) === $allocation->id ? 'selected' : '' }}>{{ $allocation->alias }}:{{ $allocation->port }}</option>
                            @endforeach
                        </select>
                        <p class="text-muted small">{{ __('admin/ui.use_a_dedicated_allocation_if_this_game_has_a_separate_query_port_the_query_port_must') }}</p>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    {!! method_field('PATCH') !!}
                    <button type="submit" class="btn btn-sm btn-primary">{{ __('admin/ui.save_query_settings') }}</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    $('#pUserId').select2({
        ajax: {
            url: '/admin/users/accounts.json',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    filter: { email: params.term },
                    page: params.page,
                };
            },
            processResults: function (data, params) {
                return { results: data };
            },
            cache: true,
        },
        escapeMarkup: function (markup) { return markup; },
        minimumInputLength: 2,
        templateResult: function (data) {
            if (data.loading) return escapeHtml(data.text);

            return '<div class="user-block"> \
                <img class="img-circle img-bordered-xs" src="https://www.gravatar.com/avatar/' + escapeHtml(data.md5) + '?s=120" alt="User Image"> \
                <span class="username"> \
                    <a href="#">' + escapeHtml(data.name_first) + ' ' + escapeHtml(data.name_last) +'</a> \
                </span> \
                <span class="description"><strong>' + escapeHtml(data.email) + '</strong> - ' + escapeHtml(data.username) + '</span> \
            </div>';
        },
        templateSelection: function (data) {
            if (typeof data.name_first === 'undefined') {
                data = {
                    md5: {{ \Illuminate\Support\Js::from(md5(strtolower($server->user->email))) }},
                    name_first: {{ \Illuminate\Support\Js::from($server->user->name_first) }},
                    name_last: {{ \Illuminate\Support\Js::from($server->user->name_last) }},
                    email: {{ \Illuminate\Support\Js::from($server->user->email) }},
                    id: {{ \Illuminate\Support\Js::from($server->owner_id) }}
                };
            }

            return '<div> \
                <span> \
                    <img class="img-rounded img-bordered-xs" src="https://www.gravatar.com/avatar/' + escapeHtml(data.md5) + '?s=120" style="height:28px;margin-top:-4px;" alt="User Image"> \
                </span> \
                <span style="padding-left:5px;"> \
                    ' + escapeHtml(data.name_first) + ' ' + escapeHtml(data.name_last) + ' (<strong>' + escapeHtml(data.email) + '</strong>) \
                </span> \
            </div>';
        }
    });
    </script>
@endsection
