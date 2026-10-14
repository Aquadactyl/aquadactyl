@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.list_users') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.users') }}<small>{{ __('admin/ui.all_registered_users_on_the_system') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li class="active">{{ __('admin/ui.users') }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">{{ __('admin/ui.user_list') }}</h3>
                <div class="box-tools search01">
                    <form action="{{ route('admin.users') }}" method="GET">
                        <div class="input-group input-group-sm">
                            <input type="text" name="filter[email]" class="form-control pull-right" value="{{ request()->input('filter.email') }}" placeholder="{{ __('admin/ui.search') }}">
                            <div class="input-group-btn">
                                <button type="submit" class="btn btn-default" aria-label="{{ __('admin/ui.search_users') }}"><i class="fa fa-search" aria-hidden="true"></i></button>
                                <a href="{{ route('admin.users.new') }}" class="btn btn-sm btn-primary">{{ __('admin/ui.create_new') }}</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <div class="box-body table-responsive no-padding" tabindex="0" role="region" aria-label="{{ __('admin/ui.user_list') }}">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>{{ __('admin/ui.email') }}</th>
                            <th>{{ __('admin/ui.client_name') }}</th>
                            <th>{{ __('admin/ui.username') }}</th>
                            <th class="text-center">2FA</th>
                            <th class="text-center"><span data-toggle="tooltip" data-placement="top" title="{{ __('admin/ui.servers_that_this_user_is_marked_as_the_owner_of') }}">{{ __('admin/ui.servers_owned') }}</span></th>
                            <th class="text-center"><span data-toggle="tooltip" data-placement="top" title="{{ __('admin/ui.servers_that_this_user_can_access_because_they_are_marked_as_a_subuser') }}">{{ __('admin/ui.can_access') }}</span></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($users as $user)
                            <tr class="align-middle">
                                <td><code>{{ $user->id }}</code></td>
                                <td><a href="{{ route('admin.users.view', $user->id) }}"><span data-sensitive tabindex="0">{{ $user->email }}</span></a> @if($user->root_admin)<i class="fa fa-star text-yellow"></i>@endif</td>
                                <td>{{ $user->name_last }}, {{ $user->name_first }}</td>
                                <td>{{ $user->username }}</td>
                                <td class="text-center">
                                    @if($user->use_totp)
                                        <i class="fa fa-lock text-green"></i>
                                    @else
                                        <i class="fa fa-unlock text-red"></i>
                                    @endif
                                </td>
                                <td class="text-center">
                                    <a href="{{ route('admin.servers', ['filter[owner_id]' => $user->id]) }}">{{ $user->servers_count }}</a>
                                </td>
                                <td class="text-center">{{ $user->subuser_of_count }}</td>
                                <td class="text-center"><img src="{{ $user->avatar_url ?? 'https://www.gravatar.com/avatar/' . md5(strtolower($user->email)) . '?s=100' }}" style="width:32px;height:32px;object-fit:cover;" class="img-circle" alt="{{ __('admin/ui.profile_picture_for', ['user' => $user->username]) }}" /></td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if($users->hasPages())
                <div class="box-footer with-border">
                    <div class="col-md-12 text-center">{!! $users->appends(['query' => Request::input('query')])->render() !!}</div>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection
