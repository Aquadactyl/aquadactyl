@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.manage_user') }} {{ $user->username }}
@endsection

@section('content-header')
    <h1>{{ $user->name_first }} {{ $user->name_last}}<small>{{ $user->username }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.users') }}">{{ __('admin/ui.users') }}</a></li>
        <li class="active">{{ $user->username }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <form action="{{ route('admin.users.view', $user->id) }}" method="post">
        <div class="col-md-6">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.identity') }}</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">{{ __('admin/ui.profile_picture') }}</label>
                        <div>
                            <img src="{{ $user->avatar_url ?? 'https://www.gravatar.com/avatar/' . md5(strtolower($user->email)) . '?s=160' }}" style="width:80px;height:80px;object-fit:cover;" class="img-circle" alt="{{ __('admin/ui.profile_picture_for', ['user' => $user->username]) }}" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="email" class="control-label">{{ __('admin/ui.email') }}</label>
                        <div>
                            <input type="email" name="email" value="{{ $user->email }}" class="form-control" autocomplete="off">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registered" class="control-label">{{ __('admin/ui.username') }}</label>
                        <div>
                            <input type="text" name="username" value="{{ $user->username }}" class="form-control" autocomplete="off">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registered" class="control-label">{{ __('admin/ui.client_first_name') }}</label>
                        <div>
                            <input type="text" name="name_first" value="{{ $user->name_first }}" class="form-control" autocomplete="off">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registered" class="control-label">{{ __('admin/ui.client_last_name') }}</label>
                        <div>
                            <input type="text" name="name_last" value="{{ $user->name_last }}" class="form-control" autocomplete="off">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="control-label">{{ __('admin/ui.default_language') }}</label>
                        <div>
                            <select name="language" class="form-control">
                                <option value="auto" @if($user->language === 'auto') selected @endif>{{ __('panel.language.automatic') }}</option>
                                @foreach($languages as $key => $value)
                                    <option value="{{ $key }}" @if($user->language === $key) selected @endif>{{ $value }}</option>
                                @endforeach
                            </select>
                            <p class="text-muted"><small>{{ __('admin/ui.the_default_language_to_use_when_rendering_the_panel_for_this_user') }}</small></p>
                        </div>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    {!! method_field('PATCH') !!}
                    <input type="submit" value="Update User" class="btn btn-primary btn-sm">
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.password') }}</h3>
                </div>
                <div class="box-body">
                    <div class="alert alert-success" style="display:none;margin-bottom:10px;" id="gen_pass"></div>
                    <div class="form-group no-margin-bottom">
                        <label for="password" class="control-label">{{ __('admin/ui.password') }} <span class="field-optional" data-label="{{ __('admin/ui.optional') }}"></span></label>
                        <div>
                            <input type="password" id="password" name="password" class="form-control" autocomplete="new-password">
                            <p class="text-muted small">{{ __('admin/ui.leave_blank_to_keep_this_user_s_password_the_same_user_will_not_receive_any_notificat') }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.permissions') }}</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="root_admin" class="control-label">{{ __('admin/ui.administrator') }}</label>
                        <div>
                            <select name="root_admin" class="form-control">
                                <option value="0">@lang('strings.no')</option>
                                <option value="1" {{ $user->root_admin ? 'selected="selected"' : '' }}>@lang('strings.yes')</option>
                            </select>
                            <p class="text-muted"><small>{{ __('admin/ui.setting_this_to_yes_gives_a_user_full_administrative_access') }}</small></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
    <div class="col-xs-12">
        <div class="box box-warning" id="account-suspension">
            <div class="box-header with-border"><h3 class="box-title">{{ __('admin/management.account_access') }}</h3><span class="label {{ $user->suspended_at ? 'label-warning' : 'label-success' }}">{{ $user->suspended_at ? __('admin/management.suspended') : __('admin/management.active') }}</span></div>
            <div class="box-body">
                <p>{{ __('admin/management.suspension_help') }}</p>
                @if($user->suspended_at)<p>{{ __('admin/management.suspended_since') }} <time datetime="{{ $user->suspended_at->toIso8601String() }}">{{ $user->suspended_at->toDayDateTimeString() }}</time></p>@if($user->suspension_reason)<p class="account-suspension-reason">{{ $user->suspension_reason }}</p>@endif @endif
                @if($suspensionPending)<div class="alert alert-{{ $suspensionErrors ? 'warning' : 'info' }}" role="status">{{ __('admin/management.sync_pending', ['count' => $suspensionPending]) }} @if($suspensionErrors){{ __('admin/management.sync_retry_help') }}@endif</div>@endif
                @if(auth()->id() === $user->id)
                    <p class="text-muted">{{ __('admin/management.cannot_suspend_self') }}</p>
                @else
                    <form method="POST" action="{{ route('admin.users.suspension', $user->id, false) }}">
                        @csrf
                        <input type="hidden" name="suspend" value="{{ $user->suspended_at ? '0' : '1' }}">
                        @unless($user->suspended_at)<div class="form-group"><label for="suspension-reason">{{ __('admin/management.reason') }}</label><textarea id="suspension-reason" name="reason" class="form-control" rows="2" maxlength="1000"></textarea></div>@endunless
                        <div class="form-group"><label for="suspension-password">{{ __('admin/operations.current_password') }}</label><input id="suspension-password" class="form-control" type="password" name="current_password" autocomplete="current-password" required></div>
                        <button class="btn {{ $user->suspended_at ? 'btn-success' : 'btn-warning' }}" type="submit">{{ $user->suspended_at ? __('admin/management.restore_user') : __('admin/management.suspend_user') }}</button>
                    </form>
                @endif
            </div>
        </div>
    </div>
    <div class="col-xs-12">
        <div class="box">
            <div class="box-header with-border"><h3 class="box-title">{{ __('admin/custom.profile_picture') }}</h3></div>
            <div class="box-body">
                @if($user->avatar)
                    <img src="{{ '/storage/' . $user->avatar }}" alt="{{ __('admin/custom.profile_picture') }}" width="96" height="96" class="admin-avatar-preview">
                    <p class="text-muted">{{ __('admin/custom.avatar_moderation_help') }}</p>
                    <form action="{{ route('admin.users.avatar.delete', $user->id) }}" method="POST">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="btn btn-danger btn-sm">{{ __('admin/custom.remove_profile_picture') }}</button>
                    </form>
                @else
                    <p class="text-muted no-margin">{{ __('admin/custom.no_profile_picture') }}</p>
                @endif
            </div>
        </div>
    </div>
    <div class="col-xs-12">
        <div class="box box-danger">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.delete_user') }}</h3>
            </div>
            <div class="box-body">
                <p class="no-margin">{{ __('admin/ui.there_must_be_no_servers_associated_with_this_account_in_order_for_it_to_be_deleted') }}</p>
            </div>
            <div class="box-footer">
                <form action="{{ route('admin.users.view', $user->id) }}" method="POST">
                    {!! csrf_field() !!}
                    {!! method_field('DELETE') !!}
                    <input id="delete" type="submit" class="btn btn-sm btn-danger pull-right" {{ $user->servers->count() < 1 ?: 'disabled' }} value="Delete User" />
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
